import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmailWithGmail } from "@/lib/email";
import { generateOverdueEmailBody, wrapEmailInTemplate } from "@/lib/ai";
import { formatCurrency } from "@/lib/templates/template-resolver";

/**
 * GET/POST /api/cron-check-overdue
 *
 * Overdue invoice detection and AI-powered reminder email system.
 *
 * This route executes the following 7-step process:
 *
 * Step 1: Fetch all invoices where currentStatus = 'pending' AND dueDate < CURRENT_DATE
 *         (invoices that were sent but now past due).
 * Step 2: For each overdue invoice, fetch the invoice owner's user_settings.
 *         Skip users who haven't configured Gmail credentials.
 * Step 3: Generate a personalized reminder email body using OpenRouter AI.
 * Step 4: Wrap the AI text in a professional HTML template with "Powered by Payo" footer.
 * Step 5: Send the email using Nodemailer with the user's stored Gmail credentials.
 * Step 6: Update the invoice status to overdue ('overdue_1').
 * Step 7: Return JSON: { success: true, processed: number, details: [...] }
 */
export async function POST(request: NextRequest) {
  return processOverdueInvoices(request);
}

export async function GET(request: NextRequest) {
  return processOverdueInvoices(request);
}

async function processOverdueInvoices(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    type DetailEntry = {
      invoiceId: string;
      invoiceNumber: string;
      clientName: string;
      clientEmail: string;
      amount: string;
      status: string;
      error?: string;
    };

    const details: DetailEntry[] = [];

    // =========================================================================
    // Step 1: Fetch Overdue Invoices
    // =========================================================================
    // Find all invoices with status 'pending' that are past their due date
    const overdueInvoices = await db.invoice.findMany({
      where: {
        currentStatus: "pending",
        dueDate: { lt: now },
        deletedAt: null,
        client: {
          deletedAt: null,
          emailStatus: { notIn: ["bounced", "complained"] },
        },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            primaryEmail: true,
          },
        },
        user: {
          select: {
            id: true,
            businessName: true,
            email: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    if (overdueInvoices.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: "No overdue invoices found",
        details: [],
      });
    }

    // =========================================================================
    // Step 2: Loop Through Overdue Invoices & Get User Settings
    // =========================================================================
    for (const invoice of overdueInvoices) {
      const detailEntry: DetailEntry = {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.client.name,
        clientEmail: invoice.client.primaryEmail,
        amount: formatCurrency(invoice.amountDue, invoice.currency),
        status: "pending",
      };

      try {
        // Fetch user settings (Gmail credentials)
        const userSettings = await db.userSettings.findUnique({
          where: { userId: invoice.user.id },
        });

        // Skip if user hasn't configured Gmail credentials
        if (!userSettings?.senderEmail || !userSettings?.senderAppPassword) {
          details.push({ ...detailEntry, status: "skipped", error: "User has not configured Gmail credentials" });
          continue;
        }

        // =====================================================================
        // Step 3: AI Email Generation (OpenRouter)
        // =====================================================================
        const aiEmailBody = await generateOverdueEmailBody({
          invoiceNumber: invoice.invoiceNumber,
          amount: formatCurrency(invoice.amountDue, invoice.currency),
          dueDate: invoice.dueDate.toISOString().split("T")[0],
        });

        // =====================================================================
        // Step 4: Construct the HTML Template
        // =====================================================================
        const htmlEmail = wrapEmailInTemplate(aiEmailBody);

        // =====================================================================
        // Step 5: Send Email (Nodemailer via Gmail)
        // =====================================================================
        const emailResult = await sendEmailWithGmail({
          to: invoice.client.primaryEmail,
          subject: `Action Required: Overdue Invoice ${invoice.invoiceNumber}`,
          html: htmlEmail,
          senderEmail: userSettings.senderEmail,
          senderAppPassword: userSettings.senderAppPassword,
        });

        if (!emailResult.success) {
          details.push({ ...detailEntry, status: "failed", error: emailResult.error || "Email sending failed" });
          continue;
        }

        // Log the reminder
        await db.reminderLog.create({
          data: {
            invoiceId: invoice.id,
            userId: invoice.user.id,
            recipientEmail: invoice.client.primaryEmail,
            emailSubject: `Action Required: Overdue Invoice ${invoice.invoiceNumber}`,
            emailBodyHtml: htmlEmail,
            status: "sent" as const,
            providerMessageId: emailResult.messageId,
          },
        });

        // =====================================================================
        // Step 6: Update Database
        // =========================================================================
        await db.invoice.update({
          where: { id: invoice.id },
          data: {
            currentStatus: "overdue_1",
            lastReminderSentAt: now,
            lastReminderStatus: "sent",
            reminderCount: { increment: 1 },
          },
        });

        details.push({ ...detailEntry, status: "sent" });
      } catch (invoiceError: unknown) {
        const errorMessage =
          invoiceError instanceof Error ? invoiceError.message : "Unknown error";
        details.push({ ...detailEntry, status: "error", error: errorMessage });
      }
    }

    // =========================================================================
    // Step 7: Response
    // =========================================================================
    const processed = details.filter(
      (d) => d.status === "sent" || d.status === "failed"
    ).length;
    const skipped = details.filter((d) => d.status === "skipped").length;
    const errors = details.filter((d) => d.status === "error").length;

    return NextResponse.json({
      success: true,
      processed,
      skipped,
      errors,
      totalFound: overdueInvoices.length,
      details,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[cron-check-overdue] Fatal error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
