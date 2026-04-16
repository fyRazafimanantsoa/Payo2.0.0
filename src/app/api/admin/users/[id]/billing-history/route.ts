import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, differenceInDays } from "date-fns";

/**
 * GET /api/admin/users/[id]/billing-history
 *
 * Returns subscription history for a specific user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const history = await db.subscriptionHistory.findMany({
      where: { userId: id },
      orderBy: { paidAt: "desc" },
      include: {
        subscription: {
          select: { id: true, billingCycle: true },
        },
        admin: { select: { email: true } },
      },
    });

    return NextResponse.json(
      history.map((h) => ({
        id: h.id,
        subscriptionId: h.subscriptionId,
        planType: h.planType,
        amount: h.amount,
        currency: h.currency,
        billingCycle: h.billingCycle,
        paidAt: h.paidAt,
        markedBy: h.admin?.email || h.markedPaidBy,
        periodStart: h.periodStart,
        periodEnd: h.periodEnd,
        notes: h.notes,
        createdAt: h.createdAt,
      })),
    );
  } catch (error: unknown) {
    return authErrorResponse(error);
  }
}
