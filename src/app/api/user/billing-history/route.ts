import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/user/billing-history
 *
 * Returns subscription history for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const history = await db.subscriptionHistory.findMany({
      where: { userId: user.id },
      orderBy: { paidAt: "desc" },
      include: {
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
        markedBy: h.admin?.email || null,
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
