import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, logAction } from "@/lib/auth";

/**
 * Allowed status transitions for bulk updates.
 * Key = current status, Value = array of allowed target statuses
 */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  upcoming: ["pending_confirmation", "uncollectible"],
  pending: ["pending_confirmation", "uncollectible"],
  overdue_1: ["pending_confirmation", "uncollectible"],
  overdue_2: ["pending_confirmation", "uncollectible"],
  pending_confirmation: ["paid"],
};

/**
 * POST /api/invoices/bulk-status
 * Update status for multiple invoices at once with transition validation.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { invoiceIds, status } = body;

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json({ error: "invoiceIds must be a non-empty array" }, { status: 400 });
    }

    if (!status || typeof status !== "string") {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    // Validate target status is valid
    const validStatuses = ["pending_confirmation", "paid", "uncollectible"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid target status. Bulk updates only support: ${validStatuses.join(", ")}` },
        { status: 400 },
      );
    }

    // Fetch all invoices that belong to the user and are not deleted
    const invoices = await db.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        userId: user.id,
        deletedAt: null,
      },
      select: { id: true, currentStatus: true },
    });

    if (invoices.length === 0) {
      return NextResponse.json({ error: "No valid invoices found" }, { status: 404 });
    }

    // Validate transitions for each invoice
    const validIds: string[] = [];
    const skipped: Array<{ id: string; reason: string }> = [];

    for (const inv of invoices) {
      const allowed = ALLOWED_TRANSITIONS[inv.currentStatus];
      if (allowed && allowed.includes(status)) {
        validIds.push(inv.id);
      } else if (inv.currentStatus === "paid" || inv.currentStatus === "uncollectible") {
        skipped.push({ id: inv.id, reason: `Invoice is in terminal status "${inv.currentStatus}"` });
      } else {
        skipped.push({
          id: inv.id,
          reason: `Cannot transition from "${inv.currentStatus}" to "${status}"`,
        });
      }
    }

    if (validIds.length === 0) {
      return NextResponse.json({
        updated: 0,
        skipped,
        message: "No invoices could be updated due to invalid transitions",
      });
    }

    // Build update data based on target status
    const updateData: Record<string, unknown> = { currentStatus: status };

    if (status === "paid" || status === "uncollectible") {
      updateData.nextReminderDate = null;
    }

    if (status === "pending_confirmation") {
      updateData.nextReminderDate = null;
    }
// Update all valid invoices
const result = await db.invoice.updateMany({
  where: { id: { in: validIds } },
  data: updateData,
});

// Log the bulk update action
await logAction({
  adminId: user.id,
  action: "bulk_invoice_status_change",
  targetUserId: user.id,
  notes: `User updated ${result.count} invoices to "${status}"`,
  newValue: { count: result.count, status },
  ipAddress: request.headers.get("x-forwarded-for") || undefined,
});

  return NextResponse.json({
      updated: result.count,
      skipped: skipped.length > 0 ? skipped : undefined,
      message: `${result.count} invoice(s) updated to "${status}"`,
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
