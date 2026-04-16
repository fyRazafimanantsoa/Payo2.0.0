import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  resolveTemplate,
  injectVariables,
  calculateTriggerPoint,
  formatCurrency,
  formatDate,
} from "@/lib/templates/template-resolver";

/**
 * GET /api/invoices/[id]/preview
 * Preview the reminder email for a specific invoice without sending it.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const invoice = await db.invoice.findFirst({
      where: { id, userId: user.id, deletedAt: null },
      include: { client: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const triggerPoint = calculateTriggerPoint(invoice.dueDate);

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

    return NextResponse.json({
      subject: renderedSubject,
      body: renderedBody,
      triggerPoint,
      templateName: template.name,
      clientName: invoice.client.name,
      recipientEmail: invoice.client.primaryEmail,
      skipReview: invoice.client.skipReminderReview,
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
