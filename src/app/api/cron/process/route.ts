import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  resolveTemplate,
  injectVariables,
  formatCurrency,
  formatDate,
  renderInvoiceListHtml,
  computeInvoiceStatus,
  computeNextReminderByStatus,
} from "@/lib/templates/template-resolver";
import { sendEmail } from "@/lib/email";
import { differenceInDays } from "date-fns";

/**
 * POST /api/cron/process
 *
 * Main frontoffice cron (runs every 30 min).
 *
 * Complete v3 spec implementation:
 *
 * 1. SELECT all users where subscription_status NOT IN ("suspended", "cancelled") AND deletedAt IS NULL
 * 2. For each user, SELECT invoices WHERE:
 *    - currentStatus IN ("upcoming", "pending", "overdue_1", "overdue_2")
 *    - nextReminderDate <= NOW()
 *    - deletedAt IS NULL
 *    - client.deletedAt IS NULL
 *    - client.emailStatus NOT IN ("bounced", "complained")
 * 3. GROUP invoices by clientId
 * 4. FOR EACH client group:
 *    a. Find HIGHEST urgency: overdue_2 > overdue_1 > pending > upcoming
 *    b. Resolve trigger_point from highest urgency
 *    c. Resolve template (3-tier: client → user → system)
 *    d. Render {{invoice_list}} as HTML table
 *    e. Render all template variables
 *    f. INSERT into reminder_logs (one per invoice in group)
 *    g. UPDATE each invoice (lastReminderSentAt, lastReminderStatus, consecutiveFailures, reminderCount, nextReminderDate)
 *    h. UPDATE invoice statuses based on dueDate
 * 5. Return { processed: count, reminders: [...], errors: [...] }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. SELECT all active users
    const activeUsers = await db.user.findMany({
      where: {
        deletedAt: null,
        subscriptionStatus: { notIn: ["suspended", "cancelled"] },
      },
    });

    if (activeUsers.length === 0) {
      return NextResponse.json({ message: "No active users found", processed: 0 });
    }

    const now = new Date();
    const processedReminders: Array<{
      userId: string;
      clientId: string;
      clientName: string;
      clientEmail: string;
      triggerPoint: string;
      invoiceCount: number;
      totalAmount: number;
      invoiceNumbers: string;
    }> = [];

    const errors: string[] = [];

    // Process each user
    for (const user of activeUsers) {
      try {
        // 2. Find all eligible invoices for this user
        const eligibleInvoices = await db.invoice.findMany({
          where: {
            userId: user.id,
            currentStatus: { in: ["upcoming", "pending", "overdue_1", "overdue_2"] },
            nextReminderDate: { lte: now },
            deletedAt: null,
            client: {
              deletedAt: null,
              emailStatus: { notIn: ["bounced", "complained"] },
            },
          },
          include: { client: true },
          orderBy: { dueDate: "asc" },
        });

        if (eligibleInvoices.length === 0) continue;

        // 3. GROUP invoices by clientId
        const grouped = new Map<string, typeof eligibleInvoices>();
        for (const inv of eligibleInvoices) {
          const list = grouped.get(inv.clientId) || [];
          list.push(inv);
          grouped.set(inv.clientId, list);
        }

        // 4. Process each client group
        for (const [clientId, invoices] of grouped) {
          try {
            const client = invoices[0].client;

            // 4a. Find HIGHEST urgency: overdue_2 > overdue_1 > pending > upcoming
            const urgencyRank: Record<string, number> = {
              upcoming: 0,
              pending: 1,
              overdue_1: 2,
              overdue_2: 3,
            };

            let highestUrgency = "upcoming";
            let highestRank = -1;
            for (const inv of invoices) {
              const rank = urgencyRank[inv.currentStatus] ?? 0;
              if (rank > highestRank) {
                highestRank = rank;
                highestUrgency = inv.currentStatus;
              }
            }

            // 4b. Resolve trigger_point from highest urgency
            const triggerPoint = resolveTriggerFromUrgency(highestUrgency, invoices, now);

            // 4c. Resolve template (3-tier: client → user → system)
            const template = await resolveTemplate(
              db,
              clientId,
              triggerPoint,
              user.defaultReminderTone as "friendly" | "neutral" | "firm",
            );

            if (!template) {
              errors.push(`No template found for client ${clientId} at trigger point ${triggerPoint}`);
              continue;
            }

            // 4d. Render {{invoice_list}} as HTML table
            const invoiceListHtml = renderInvoiceListHtml(
              invoices.map((inv) => ({
                invoiceNumber: inv.invoiceNumber,
                amountDue: inv.amountDue,
                currency: inv.currency,
                dueDate: inv.dueDate,
                currentStatus: computeInvoiceStatus(inv.dueDate, now),
              })),
            );

            // 4e. Render all template variables
            // Use the earliest due date invoice for due_date and days_overdue
            const oldestInvoice = invoices.reduce((oldest, inv) =>
              inv.dueDate < oldest.dueDate ? inv : oldest,
            );

            const daysOverdue = Math.max(0, differenceInDays(now, oldestInvoice.dueDate));
            const totalAmount = invoices.reduce((sum, inv) => sum + inv.amountDue, 0);
            const invoiceNumbers = invoices.map((inv) => inv.invoiceNumber).join(", ");

            const variables = {
              client_name: client.name,
              freelancer_name: user.businessName,
              amount_due: formatCurrency(totalAmount, invoices[0].currency),
              currency: invoices[0].currency,
              due_date: formatDate(oldestInvoice.dueDate),
              invoice_number: invoiceNumbers,
              days_overdue: String(daysOverdue),
              invoice_list: invoiceListHtml,
            };

            const renderedBody = injectVariables(template.htmlBody, variables);
            const renderedSubject = template.subjectLine.replace(
              /\{\{(\w+)\}\}/g,
              (_match, key: string) => (variables as Record<string, string>)[key] ?? "",
            );

            // Parse CC emails
            const ccEmailArray = client.ccEmails
              ? (JSON.parse(client.ccEmails) as string[])
              : [];

            // Actually send the email
            const emailResult = await sendEmail({
              to: client.primaryEmail,
              cc: ccEmailArray.length > 0 ? ccEmailArray : undefined,
              subject: renderedSubject,
              html: renderedBody,
            });

            // 4f. INSERT into reminder_logs (one per invoice in group)
            for (const inv of invoices) {
              await db.reminderLog.create({
                data: {
                  invoiceId: inv.id,
                  userId: user.id,
                  templateId: template.id,
                  recipientEmail: client.primaryEmail,
                  ccEmails: client.ccEmails,
                  emailSubject: renderedSubject,
                  emailBodyHtml: renderedBody,
                  status: emailResult.success ? "sent" : "failed",
                  providerMessageId: emailResult.success ? emailResult.messageId : undefined,
                  failureReason: emailResult.error || null,
                },
              });
            }

            // 4g. UPDATE each invoice
            for (const inv of invoices) {
              // 4h. First compute the new status based on dueDate
              const newStatus = computeInvoiceStatus(inv.dueDate, now);

              // Compute nextReminderDate based on new status
              const nextReminder = computeNextReminderByStatus(newStatus, inv.dueDate, now);

              await db.invoice.update({
                where: { id: inv.id },
                data: {
                  currentStatus: newStatus,
                  lastReminderSentAt: now,
                  lastReminderStatus: emailResult.success ? "sent" : "failed",
                  consecutiveFailures: emailResult.success ? 0 : { increment: 1 },
                  reminderCount: { increment: 1 },
                  nextReminderDate: nextReminder,
                },
              });
            }

            // Log the result
            if (emailResult.success) {
              console.log(`=== CRON REMINDER SENT ===`);
              console.log(`To: ${client.primaryEmail}`);
              console.log(`Subject: ${renderedSubject}`);
              console.log(`Trigger Point: ${triggerPoint}`);
              console.log(`Client: ${client.name}`);
              console.log(`Invoices: ${invoiceNumbers}`);
              console.log(`Total Amount: ${formatCurrency(totalAmount, invoices[0].currency)}`);
              console.log(`Highest Urgency: ${highestUrgency}`);
              console.log(`Invoices in group: ${invoices.length}`);
              console.log(`Message ID: ${emailResult.messageId}`);
              console.log(`==========================`);
            } else {
              console.error(`=== CRON REMINDER FAILED ===`);
              console.error(`To: ${client.primaryEmail}`);
              console.error(`Error: ${emailResult.error}`);
              console.error(`===========================`);
            }

            processedReminders.push({
              userId: user.id,
              clientId,
              clientName: client.name,
              clientEmail: client.primaryEmail,
              triggerPoint,
              invoiceCount: invoices.length,
              totalAmount,
              invoiceNumbers,
            });
          } catch (groupError: unknown) {
            const msg = groupError instanceof Error ? groupError.message : "Unknown error";
            errors.push(`Error processing client ${clientId} for user ${user.id}: ${msg}`);
          }
        }
      } catch (userError: unknown) {
        const msg = userError instanceof Error ? userError.message : "Unknown error";
        errors.push(`Error processing user ${user.id}: ${msg}`);
      }
    }

    return NextResponse.json({
      processed: processedReminders.length,
      reminders: processedReminders,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Helper: resolve trigger_point from highest urgency status and invoice data
// ---------------------------------------------------------------------------

/**
 * Map highest urgency status to the appropriate trigger point.
 *
 * - upcoming → "pre_due_7" or "pre_due_3" (based on days to due)
 * - pending → "due_today"
 * - overdue_1 → "overdue_7" (or "overdue_3" if < 7 days overdue)
 * - overdue_2 → "overdue_14" (or "overdue_21"/"overdue_30"/"final_notice" based on days)
 */
function resolveTriggerFromUrgency(
  urgency: string,
  invoices: { dueDate: Date }[],
  now: Date,
): string {
  // Use the earliest due date for calculations
  const earliestDue = invoices.reduce((earliest, inv) =>
    inv.dueDate < earliest.dueDate ? inv : earliest,
  ).dueDate;

  const daysUntilDue = differenceInDays(earliestDue, now);
  const daysOverdue = Math.abs(Math.min(0, daysUntilDue));

  switch (urgency) {
    case "upcoming":
      // Based on days to due
      if (daysUntilDue >= 7) return "pre_due_7";
      return "pre_due_3";

    case "pending":
      return "due_today";

    case "overdue_1":
      // Based on how overdue
      if (daysOverdue < 7) return "overdue_3";
      return "overdue_7";

    case "overdue_2":
      // Based on how overdue
      if (daysOverdue < 14) return "overdue_14";
      if (daysOverdue < 21) return "overdue_21";
      if (daysOverdue < 30) return "overdue_30";
      return "final_notice";

    default:
      return "due_today";
  }
}
