import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, logAction } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import {
  resolveTemplate,
  injectVariables,
  calculateTriggerPoint,
  calculateNextReminderDate,
  formatCurrency,
  formatDate,
} from "@/lib/templates/template-resolver";

/** Rate limits */
const MAX_REMINDERS_PER_INVOICE_24H = 3;
const MAX_REMINDERS_PER_USER_1H = 10;

/**
 * POST /api/invoices/[id]/send-reminder
 * Manually send a reminder for a specific invoice.
 *
 * Rate limits:
 * - Max 3 per invoice per 24h
 * - Max 10 per user per hour
 *
 * Also checks subscription_status allows sending (not suspended/cancelled).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    // Check subscription status allows sending
    if (user.subscriptionStatus === "suspended" || user.subscriptionStatus === "cancelled") {
      return NextResponse.json(
        { error: `Cannot send reminders: subscription is ${user.subscriptionStatus}` },
        { status: 403 },
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

    // Don't allow sending for terminal states
    if (invoice.currentStatus === "paid" || invoice.currentStatus === "uncollectible") {
      return NextResponse.json(
        { error: `Cannot send reminder for invoice in terminal status "${invoice.currentStatus}"` },
        { status: 400 },
      );
    }

    // Rate limit: max 3 per invoice per 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const invoiceReminderCount = await db.reminderLog.count({
      where: {
        invoiceId: invoice.id,
        sentAt: { gte: twentyFourHoursAgo },
      },
    });

    if (invoiceReminderCount >= MAX_REMINDERS_PER_INVOICE_24H) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded: max ${MAX_REMINDERS_PER_INVOICE_24H} reminders per invoice per 24 hours`,
          retryAfter: "24h",
        },
        { status: 429 },
      );
    }

    // Rate limit: max 10 per user per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const userReminderCount = await db.reminderLog.count({
      where: {
        userId: user.id,
        sentAt: { gte: oneHourAgo },
      },
    });

    if (userReminderCount >= MAX_REMINDERS_PER_USER_1H) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded: max ${MAX_REMINDERS_PER_USER_1H} reminders per user per hour`,
          retryAfter: "1h",
        },
        { status: 429 },
      );
    }

    // Don't send to bounced or complained clients
    if (invoice.client.emailStatus === "bounced" || invoice.client.emailStatus === "complained") {
      return NextResponse.json(
        { error: `Cannot send reminder: client email status is "${invoice.client.emailStatus}"` },
        { status: 400 },
      );
    }

    const triggerPoint = calculateTriggerPoint(invoice.dueDate);

    // Resolve template
    const template = await resolveTemplate(
      db,
      invoice.clientId,
      triggerPoint,
      user.defaultReminderTone as "friendly" | "neutral" | "firm",
    );

    if (!template) {
      return NextResponse.json(
        { error: `No template found for trigger point "${triggerPoint}"` },
        { status: 404 },
      );
    }

    // Build template variables
    const daysOverdue = Math.max(0, Math.floor((Date.now() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)));
    const variables = {
      client_name: invoice.client.name,
      freelancer_name: user.businessName,
      amount_due: formatCurrency(invoice.amountDue, invoice.currency),
      currency: invoice.currency,
      due_date: formatDate(invoice.dueDate),
      invoice_number: invoice.invoiceNumber,
      days_overdue: String(daysOverdue),
      invoice_list: `${invoice.invoiceNumber} — ${formatCurrency(invoice.amountDue, invoice.currency)}`,
    };

    const renderedBody = injectVariables(template.htmlBody, variables);
    const renderedSubject = template.subjectLine.replace(
      /\{\{(\w+)\}\}/g,
      (_match, key: string) => (variables as Record<string, string>)[key] ?? "",
    );

    // Parse CC emails
    const ccEmailArray = invoice.client.ccEmails
      ? (JSON.parse(invoice.client.ccEmails) as string[])
      : [];

    // Actually send the email
    const emailResult = await sendEmail({
      to: invoice.client.primaryEmail,
      cc: ccEmailArray.length > 0 ? ccEmailArray : undefined,
      subject: renderedSubject,
      html: renderedBody,
    });

    // Update invoice reminder tracking
    const nextReminder = calculateNextReminderDate(invoice.dueDate, triggerPoint);
    await db.invoice.update({
      where: { id },
      data: {
        lastReminderSentAt: new Date(),
        nextReminderDate: nextReminder,
        lastReminderStatus: emailResult.success ? "sent" : "failed",
        consecutiveFailures: emailResult.success ? 0 : { increment: 1 },
        reminderCount: { increment: 1 },
      },
    });

    // Log reminder
    const logResult = await db.reminderLog.create({
      data: {
        invoiceId: invoice.id,
        userId: user.id,
        templateId: template.id,
        recipientEmail: invoice.client.primaryEmail,
        ccEmails: invoice.client.ccEmails,
        emailSubject: renderedSubject,
        emailBodyHtml: renderedBody,
        status: emailResult.success ? "sent" : "failed",
        providerMessageId: emailResult.success ? emailResult.messageId : undefined,
        failureReason: emailResult.error || null,
      },
    });

    // Log the manual reminder action in AdminLog
    await logAction({
      adminId: user.id,
      action: "send_manual_reminder",
      targetUserId: user.id,
      notes: `User manually sent reminder for invoice ${invoice.invoiceNumber} (Trigger: ${triggerPoint})`,
      newValue: { logId: logResult.id, triggerPoint },
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: `Failed to send email: ${emailResult.error}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Reminder processed successfully",
      reminder: {
        to: invoice.client.primaryEmail,
        subject: renderedSubject,
        triggerPoint,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      },
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
