import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, logAction } from "@/lib/auth";
import { differenceInDays } from "date-fns";

/**
 * GET /api/invoices/[id]
 * Get a single invoice with client info and delivery badge.
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
      include: { 
        client: true,
        reminderLogs: {
          orderBy: { sentAt: 'desc' },
          take: 50
        }
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Build delivery badge
    let deliveryBadge: { status: string; label: string; lastSent: string | null } = {
      status: "none",
      label: "No reminders sent",
      lastSent: null,
    };

    if (invoice.lastReminderSentAt && invoice.lastReminderStatus) {
      const lastSent = invoice.lastReminderSentAt.toISOString();
      if (invoice.lastReminderStatus === "sent") {
        deliveryBadge = { status: "sent", label: "Delivered", lastSent };
      } else if (invoice.lastReminderStatus === "failed") {
        deliveryBadge = { status: "failed", label: "Failed", lastSent };
      } else if (invoice.lastReminderStatus === "bounced") {
        deliveryBadge = { status: "bounced", label: "Bounced", lastSent };
      }
    }

    return NextResponse.json({
      ...invoice,
      clientName: invoice.client.name,
      clientEmail: invoice.client.primaryEmail,
      deliveryBadge,
      daysOverdue: Math.max(0, differenceInDays(new Date(), invoice.dueDate)),
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
 * PATCH /api/invoices/[id]
 * Update an invoice. Verifies ownership. Recalculates status if dueDate changes.
 * Allowed fields: amountDue, currency, dueDate, issueDate, invoiceNumber, notes
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const { amountDue, currency, dueDate, issueDate, invoiceNumber, notes } = body;

    // Verify invoice belongs to user
    const invoice = await db.invoice.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Don't allow updates to terminal states
    if (invoice.currentStatus === "paid" || invoice.currentStatus === "uncollectible") {
      return NextResponse.json(
        { error: `Cannot update invoice in terminal status "${invoice.currentStatus}"` },
        { status: 400 },
      );
    }

    // Validate amountDue if provided
    if (amountDue !== undefined) {
      const amount = parseFloat(amountDue);
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          { error: "amountDue must be a positive number" },
          { status: 400 },
        );
      }
    }

    // Validate dates if provided
    if (dueDate !== undefined && issueDate !== undefined) {
      if (new Date(dueDate) <= new Date(issueDate)) {
        return NextResponse.json(
          { error: "dueDate must be after issueDate" },
          { status: 400 },
        );
      }
    } else if (dueDate !== undefined) {
      const newDue = new Date(dueDate);
      const issue = invoice.issueDate;
      if (newDue <= issue) {
        return NextResponse.json(
          { error: "dueDate must be after issueDate" },
          { status: 400 },
        );
      }
    } else if (issueDate !== undefined) {
      const newIssue = new Date(issueDate);
      const due = invoice.dueDate;
      if (due <= newIssue) {
        return NextResponse.json(
          { error: "dueDate must be after issueDate" },
          { status: 400 },
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (amountDue !== undefined) updateData.amountDue = parseFloat(amountDue);
    if (currency !== undefined) updateData.currency = currency;
    if (issueDate !== undefined) updateData.issueDate = new Date(issueDate);
    if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber;
    if (notes !== undefined) updateData.notes = notes;

    // If dueDate changed, recalculate status
    if (dueDate !== undefined) {
      const newDue = new Date(dueDate);
      updateData.dueDate = newDue;

      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      if (newDue > threeDaysFromNow) {
        updateData.currentStatus = "upcoming";
        updateData.nextReminderDate = new Date(newDue.getTime() - 3 * 24 * 60 * 60 * 1000);
      } else {
        updateData.currentStatus = "pending";
        updateData.nextReminderDate = now;
      }
    }

    const updated = await db.invoice.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { name: true, primaryEmail: true } },
      },
    });

    // Log the invoice update action
    await logAction({
      adminId: user.id,
      action: "update_invoice",
      targetUserId: user.id,
      previousValue: invoice,
      newValue: updated,
      notes: `User updated invoice ${updated.invoiceNumber}`,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({
    ...updated,
      clientName: updated.client.name,
      clientEmail: updated.client.primaryEmail,
      daysOverdue: Math.max(0, differenceInDays(new Date(), updated.dueDate)),
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
 * DELETE /api/invoices/[id]
 * Soft delete an invoice (sets deletedAt instead of hard delete).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const invoice = await db.invoice.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const deleted = await db.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Log the deletion action
    await logAction({
      adminId: user.id,
      action: "delete_invoice",
      targetUserId: user.id,
      previousValue: invoice,
      notes: `User soft-deleted invoice ${invoice.invoiceNumber}`,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({ success: true, message: "Invoice deleted" });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { statusCode: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
