import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, logAction } from "@/lib/auth";
import {
  calculateTriggerPoint,
  calculateNextReminderDate,
} from "@/lib/templates/template-resolver";
import { differenceInDays } from "date-fns";

/** Plan limits for max_invoices */
const PLAN_INVOICE_LIMITS: Record<string, number> = {
  trial: 20,
  starter: 100,
  pro: 999999,
};

/**
 * GET /api/invoices
 * List invoices for the authenticated user with filters.
 * Supports: ?status=..., ?client_id=..., ?search=...
 * Includes: client name, delivery status badge info
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("client_id");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      userId: user.id,
      deletedAt: null,
    };
    if (status) where.currentStatus = status;
    if (clientId) where.clientId = clientId;

    // Search across invoice number and client name
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { client: { name: { contains: search } } },
        { client: { primaryEmail: { contains: search } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        include: {
          client: {
            select: { name: true, primaryEmail: true },
          },
        },
        orderBy: { dueDate: "asc" },
        skip,
        take: limit,
      }),
      db.invoice.count({ where }),
    ]);

    // Build delivery status badge info for each invoice
    const result = invoices.map((inv) => {
      let deliveryBadge: { status: string; label: string; lastSent: string | null } = {
        status: "none",
        label: "No reminders sent",
        lastSent: null,
      };

      if (inv.lastReminderSentAt && inv.lastReminderStatus) {
        const lastSent = inv.lastReminderSentAt.toISOString();
        if (inv.lastReminderStatus === "sent") {
          deliveryBadge = { status: "sent", label: "Delivered", lastSent };
        } else if (inv.lastReminderStatus === "failed") {
          deliveryBadge = { status: "failed", label: "Failed", lastSent };
        } else if (inv.lastReminderStatus === "bounced") {
          deliveryBadge = { status: "bounced", label: "Bounced", lastSent };
        }
      }

      return {
        ...inv,
        clientName: inv.client.name,
        clientEmail: inv.client.primaryEmail,
        deliveryBadge,
        daysOverdue: Math.max(0, differenceInDays(new Date(), inv.dueDate)),
      };
    });

    return NextResponse.json({
      invoices: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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

/**
 * POST /api/invoices
 * Create a new invoice with plan limit check, validation, and status computation.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { clientId, invoiceNumber, amountDue, currency, issueDate, dueDate, notes } = body;

    if (!clientId || !invoiceNumber || amountDue == null || !issueDate || !dueDate) {
      return NextResponse.json(
        { error: "Missing required fields: clientId, invoiceNumber, amountDue, issueDate, dueDate" },
        { status: 400 },
      );
    }

    const amount = parseFloat(amountDue);
    const issue = new Date(issueDate);
    const due = new Date(dueDate);

    // Validate amountDue > 0
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "amountDue must be a positive number" },
        { status: 400 },
      );
    }

    // Validate dueDate > issueDate
    if (due <= issue) {
      return NextResponse.json(
        { error: "dueDate must be after issueDate" },
        { status: 400 },
      );
    }

    // Validate client exists and belongs to user
    const client = await db.client.findFirst({
      where: { id: clientId, userId: user.id, deletedAt: null },
    });
    if (!client) {
      return NextResponse.json(
        { error: "Client not found or does not belong to you" },
        { status: 400 },
      );
    }

    // Auto-generate invoice number if not provided or follows a pattern
    let finalInvoiceNumber = invoiceNumber;
    const nextNumber = client.lastInvoiceNumber + 1;

    if (!finalInvoiceNumber || finalInvoiceNumber.includes("{{")) {
      const pattern = finalInvoiceNumber || user.invoicePattern || "INV-{{YEAR}}-{{ID}}";
      const year = new Date().getFullYear().toString();
      finalInvoiceNumber = pattern
        .replace("{{YEAR}}", year)
        .replace("{{ID}}", nextNumber.toString().padStart(3, "0"));
    }

    // Check plan limits
    const maxInvoices = PLAN_INVOICE_LIMITS[user.planType] || PLAN_INVOICE_LIMITS.trial;
    const currentCount = await db.invoice.count({
      where: { userId: user.id, deletedAt: null },
    });

    if (currentCount >= maxInvoices) {
      return NextResponse.json(
        { error: `Invoice limit reached (${maxInvoices} for ${user.planType} plan). Please upgrade your plan.` },
        { status: 403 },
      );
    }

    // Compute initial status from dueDate
    const now = new Date();
    let currentStatus: string;
    let nextReminderDate: Date;

    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    if (due > threeDaysFromNow) {
      // "upcoming" — not due soon
      currentStatus = "upcoming";
      nextReminderDate = new Date(due.getTime() - 3 * 24 * 60 * 60 * 1000);
    } else {
      // "pending" — due within 3 days or already past
      currentStatus = "pending";
      nextReminderDate = now;
    }

    // Use transaction to create invoice and increment client counter
    const [invoice] = await db.$transaction([
      db.invoice.create({
        data: {
          userId: user.id,
          clientId,
          invoiceNumber: finalInvoiceNumber,
          amountDue: amount,
          currency: currency || "USD",
          issueDate: issue,
          dueDate: due,
          currentStatus,
          nextReminderDate,
          notes: notes || null,
        },
        include: {
          client: { select: { name: true, primaryEmail: true } },
        },
      }),
      db.client.update({
        where: { id: clientId },
        data: { lastInvoiceNumber: nextNumber },
      }),
    ]);

    // Log the invoice creation action
    await logAction({
      adminId: user.id,
      action: "create_invoice",
      targetUserId: user.id,
      notes: `User created invoice ${invoice.invoiceNumber} for client: ${invoice.client.name}`,
      newValue: invoice,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({
      ...invoice,
      clientName: invoice.client.name,
    }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { statusCode: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
