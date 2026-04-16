import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/admin/users/[id]/mark-paid
 *
 * Mark a user's subscription as paid.
 * Input: { subscriptionId?, amount?, notes? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const { subscriptionId, amount, notes } = body;

    const user = await db.user.findUnique({
      where: { id },
      include: {
        subscriptions: {
          where: { status: { not: "cancelled" } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!user || user.deletedAt) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the subscription
    let subscription;
    if (subscriptionId) {
      subscription = await db.subscription.findFirst({
        where: { id: subscriptionId, userId: id },
      });
    } else {
      subscription = user.subscriptions[0];
    }

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 },
      );
    }

    const previousStatus = subscription.status;
    const now = new Date();
    const paidAmount = amount || subscription.amount;

    // Compute period boundaries
    const periodStart = subscription.createdAt;
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Update subscription
    const updatedSub = await db.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "paid",
        paidAt: now,
        markedPaidBy: admin.id,
      },
    });

    // Create subscription history record
    await db.subscriptionHistory.create({
      data: {
        userId: id,
        subscriptionId: subscription.id,
        planType: subscription.planType,
        amount: paidAmount,
        currency: subscription.currency,
        billingCycle: subscription.billingCycle,
        paidAt: now,
        markedPaidBy: admin.id,
        periodStart,
        periodEnd,
        notes,
      },
    });

    // Update user status
    const updatedUser = await db.user.update({
      where: { id },
      data: {
        subscriptionStatus: "active",
        planType: subscription.planType,
      },
    });

    // Log admin action
    await db.adminLog.create({
      data: {
        adminId: admin.id,
        action: "mark_paid",
        targetUserId: id,
        targetSubscriptionId: subscription.id,
        previousValue: JSON.stringify({ subscriptionStatus: previousStatus, amount: subscription.amount }),
        newValue: JSON.stringify({ subscriptionStatus: "paid", amount: paidAmount }),
        notes,
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
      },
    });

    const { hashedPassword: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json({
      user: userWithoutPassword,
      subscription: updatedSub,
    });
  } catch (error: unknown) {
    return authErrorResponse(error);
  }
}
