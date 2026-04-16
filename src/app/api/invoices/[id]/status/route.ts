import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, logAction } from "@/lib/auth";
import {
  resolveTemplate,
  injectVariables,
  formatCurrency,
  formatDate,
} from "@/lib/templates/template-resolver";

/**
 * Allowed status transitions for the invoice state machine.
 * Key = current status, Value = array of allowed target statuses
 *
 * Rules:
 * - Any non-terminal → pending_confirmation
 * - pending_confirmation → paid
 * - Any non-terminal → uncollectible
 * - No transitions FROM paid or uncollectible (terminal states)
 */
const STATE_TRANSITIONS: Record<string, string[]> = {
  upcoming: ["pending_confirmation", "uncollectible"],
  pending: ["pending_confirmation", "uncollectible"],
  overdue_1: ["pending_confirmation", "uncollectible"],
  overdue_2: ["pending_confirmation", "uncollectible"],
  pending_confirmation: ["paid"],
  // paid and uncollectible are NOT in this map — no transitions allowed from them
};

const TERMINAL_STATES = ["paid", "uncollectible"];

/**
 * POST /api/invoices/[id]/status
 * Change invoice status with state machine validation.
 *
 * When status → "paid":
 *   - Optionally send payment_confirmed template email (log to reminder_logs)
 *   - Set nextReminderDate = null
 *
 * When status → "uncollectible":
 *   - Log to reminder_logs with write_off_notice template
 *   - Set nextReminderDate = null
 *
 * When status → "pending_confirmation":
 *   - Set nextReminderDate = null (pause auto-reminders)
 *   - Optionally send pending_confirmation template email
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    const validStatuses = ["pending_confirmation", "paid", "uncollectible"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid target status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 },
      );
    }

    // Fetch invoice and verify ownership
    const invoice = await db.invoice.findFirst({
      where: { id, userId: user.id, deletedAt: null },
      include: { client: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Validate state transition
    const currentStatus = invoice.currentStatus;

    // No transitions from terminal states
    if (TERMINAL_STATES.includes(currentStatus)) {
      return NextResponse.json(
        { error: `Cannot change status from terminal state "${currentStatus}"` },
        { status: 400 },
      );
    }

    const allowed = STATE_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(status)) {
      return NextResponse.json(
        { error: `Invalid transition: cannot go from "${currentStatus}" to "${status}"` },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {
      currentStatus: status,
      nextReminderDate: null, // Pause auto-reminders for all target statuses
    };

    // Save notes if provided
    if (notes) {
      const existingNotes = invoice.notes ? invoice.notes + "\n" : "";
      updateData.notes = existingNotes + `[Status → ${status}] ${notes}`;
    }

    // When marking as paid, accept optional proof of payment
    const { proofOfPaymentUrl } = body;
    if (status === "paid" && proofOfPaymentUrl) {
      updateData.proofOfPaymentUrl = proofOfPaymentUrl;
    }

    // Handle email notifications for status changes
    try {
      if (status === "paid") {
        // Try to resolve and send payment_confirmed template
        const template = await resolveTemplate(
          db,
          invoice.clientId,
          "payment_confirmed",
          user.defaultReminderTone as "friendly" | "neutral" | "firm",
        );

        if (template) {
          const variables = {
            client_name: invoice.client.name,
            freelancer_name: user.businessName,
            amount_due: formatCurrency(invoice.amountDue, invoice.currency),
            currency: invoice.currency,
            due_date: formatDate(invoice.dueDate),
            invoice_number: invoice.invoiceNumber,
            days_overdue: "0",
            invoice_list: "",
          };

          const renderedBody = injectVariables(template.htmlBody, variables);
          const renderedSubject = template.subjectLine.replace(
            /\{\{(\w+)\}\}/g,
            (_match, key: string) => (variables as Record<string, string>)[key] ?? "",
          );

          await db.reminderLog.create({
            data: {
              invoiceId: invoice.id,
              userId: user.id,
              templateId: template.id,
              recipientEmail: invoice.client.primaryEmail,
              ccEmails: invoice.client.ccEmails,
              emailSubject: renderedSubject,
              emailBodyHtml: renderedBody,
              status: "sent",
            },
          });

          console.log("=== PAYMENT CONFIRMED EMAIL ===");
          console.log(`EMAIL_WOULD_BE_SENT to: ${invoice.client.primaryEmail}`);
          console.log(`Subject: ${renderedSubject}`);
          console.log("================================");
        }
      } else if (status === "uncollectible") {
        // Send write_off_notice template
        const template = await resolveTemplate(
          db,
          invoice.clientId,
          "write_off_notice",
          user.defaultReminderTone as "friendly" | "neutral" | "firm",
        );

        if (template) {
          const daysOverdue = Math.max(0, Math.floor((Date.now() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)));
          const variables = {
            client_name: invoice.client.name,
            freelancer_name: user.businessName,
            amount_due: formatCurrency(invoice.amountDue, invoice.currency),
            currency: invoice.currency,
            due_date: formatDate(invoice.dueDate),
            invoice_number: invoice.invoiceNumber,
            days_overdue: String(daysOverdue),
            invoice_list: "",
          };

          const renderedBody = injectVariables(template.htmlBody, variables);
          const renderedSubject = template.subjectLine.replace(
            /\{\{(\w+)\}\}/g,
            (_match, key: string) => (variables as Record<string, string>)[key] ?? "",
          );

          await db.reminderLog.create({
            data: {
              invoiceId: invoice.id,
              userId: user.id,
              templateId: template.id,
              recipientEmail: invoice.client.primaryEmail,
              ccEmails: invoice.client.ccEmails,
              emailSubject: renderedSubject,
              emailBodyHtml: renderedBody,
              status: "sent",
            },
          });

          console.log("=== WRITE OFF NOTICE EMAIL ===");
          console.log(`EMAIL_WOULD_BE_SENT to: ${invoice.client.primaryEmail}`);
          console.log(`Subject: ${renderedSubject}`);
          console.log("===============================");
        }
      } else if (status === "pending_confirmation") {
        // Optionally send pending_confirmation template
        const template = await resolveTemplate(
          db,
          invoice.clientId,
          "pending_confirmation",
          user.defaultReminderTone as "friendly" | "neutral" | "firm",
        );

        if (template) {
          const variables = {
            client_name: invoice.client.name,
            freelancer_name: user.businessName,
            amount_due: formatCurrency(invoice.amountDue, invoice.currency),
            currency: invoice.currency,
            due_date: formatDate(invoice.dueDate),
            invoice_number: invoice.invoiceNumber,
            days_overdue: "0",
            invoice_list: "",
          };

          const renderedBody = injectVariables(template.htmlBody, variables);
          const renderedSubject = template.subjectLine.replace(
            /\{\{(\w+)\}\}/g,
            (_match, key: string) => (variables as Record<string, string>)[key] ?? "",
          );

          await db.reminderLog.create({
            data: {
              invoiceId: invoice.id,
              userId: user.id,
              templateId: template.id,
              recipientEmail: invoice.client.primaryEmail,
              ccEmails: invoice.client.ccEmails,
              emailSubject: renderedSubject,
              emailBodyHtml: renderedBody,
              status: "sent",
            },
          });

          console.log("=== PENDING CONFIRMATION EMAIL ===");
          console.log(`EMAIL_WOULD_BE_SENT to: ${invoice.client.primaryEmail}`);
          console.log(`Subject: ${renderedSubject}`);
          console.log("==================================");
        }
      }
    } catch (emailError) {
      // Log email error but don't fail the status change
      console.error("Failed to send notification email:", emailError);
    }
// Update the invoice
const updated = await db.invoice.update({
  where: { id },
  data: updateData,
  include: { client: true },
});

// Log the status change action
await logAction({
  adminId: user.id,
  action: `invoice_status_change_${status}`,
  targetUserId: user.id,
  previousValue: { status: currentStatus },
  newValue: { status: status, notes: notes },
  notes: `User changed invoice ${invoice.invoiceNumber} status from ${currentStatus} to ${status}`,
  ipAddress: request.headers.get("x-forwarded-for") || undefined,
});

  return NextResponse.json({
      success: true,
      invoice: updated,
      transition: { from: currentStatus, to: status },
    });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { statusCode: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
