import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/admin/users/[id]/change-plan
 *
 * Change a user's plan and billing cycle.
 * Input: { planType: "starter" | "pro", billingCycle: "monthly" | "annual" }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const { planType, billingCycle } = body;

    const validPlans = ["starter", "pro"];
    const validCycles = ["monthly", "annual"];

    if (!planType || !validPlans.includes(planType)) {
      return NextResponse.json(
        { error: "Invalid planType. Must be 'starter' or 'pro'." },
        { status: 400 },
      );
    }

    if (!billingCycle || !validCycles.includes(billingCycle)) {
      return NextResponse.json(
        { error: "Invalid billingCycle. Must be 'monthly' or 'annual'." },
        { status: 400 },
      );
    }

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

    const previousPlan = user.planType;
    const previousCycle = user.subscriptions[0]?.billingCycle || "monthly";

    // Compute amount
    const baseAmount = planType === "pro" ? 29 : 9;
    const amount = billingCycle === "annual" ? baseAmount * 10 : baseAmount; // 2 months discount for annual

    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const existingSub = user.subscriptions[0];

    if (existingSub) {
      // Update existing subscription
      await db.subscription.update({
        where: { id: existingSub.id },
        data: {
          planType,
          billingCycle,
          amount,
          dueDate,
          status: "pending",
          paidAt: null,
          markedPaidBy: null,
          overdueSince: null,
          lastReminderSentAt: null,
          nextReminderDate: now,
        },
      });
    } else {
      // Create new subscription
      await db.subscription.create({
        data: {
          userId: id,
          planType,
          amount,
          currency: "USD",
          billingCycle,
          dueDate,
          status: "pending",
          nextReminderDate: now,
        },
      });
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id },
      data: {
        planType,
        subscriptionStatus: "active",
      },
    });

    // Log admin action
    await db.adminLog.create({
      data: {
        adminId: admin.id,
        action: "change_plan",
        targetUserId: id,
        targetSubscriptionId: existingSub?.id,
        previousValue: JSON.stringify({ planType: previousPlan, billingCycle: previousCycle }),
        newValue: JSON.stringify({ planType, billingCycle, amount }),
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
      },
    });

    const { hashedPassword: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword);
  } catch (error: unknown) {
    return authErrorResponse(error);
  }
}
