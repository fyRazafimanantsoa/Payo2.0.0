import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, differenceInDays } from "date-fns";

/**
 * POST /api/admin/users/[id]/send-reminder
 *
 * Send a payment reminder to the user. For now, just logs the action.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const notes = body.notes || "";

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

    const subscription = user.subscriptions[0];
    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 },
      );
    }

    const payoneerEmail = process.env.PAYONEER_EMAIL || "payments@payo.com";
    const now = new Date();

    // Log that a reminder would be sent
    console.log("=== ADMIN PAYMENT REMINDER ===");
    console.log(`ADMIN_REMINDER_WOULD_BE_SENT to: ${user.email}`);
    console.log(`Business: ${user.businessName}`);
    console.log(`Plan: ${subscription.planType} (${subscription.billingCycle})`);
    console.log(`Amount: $${subscription.amount} ${subscription.currency}`);
    console.log(`Due Date: ${subscription.dueDate}`);
    console.log(`Status: ${subscription.status}`);
    console.log(`Payment Email: ${payoneerEmail}`);
    console.log("===============================");

    // Compute next reminder date
    let nextReminderDate: Date;
    if (subscription.status === "pending") {
      nextReminderDate = addDays(now, 3);
    } else if (subscription.overdueSince) {
      const daysOverdue = differenceInDays(now, subscription.overdueSince);
      nextReminderDate = daysOverdue >= 14 ? addDays(now, 3) : addDays(now, 5);
    } else {
      nextReminderDate = addDays(now, 5);
    }

    // Update subscription
    await db.subscription.update({
      where: { id: subscription.id },
      data: {
        lastReminderSentAt: now,
        nextReminderDate,
      },
    });

    // Log admin action
    await db.adminLog.create({
      data: {
        adminId: admin.id,
        action: "send_reminder",
        targetUserId: id,
        targetSubscriptionId: subscription.id,
        newValue: JSON.stringify({ subscriptionStatus: subscription.status, amount: subscription.amount }),
        notes: `ADMIN_REMINDER_WOULD_BE_SENT. ${notes}`.trim(),
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
      },
    });

    return NextResponse.json({
      message: "Payment reminder logged",
      user: user.email,
      planType: subscription.planType,
      amount: subscription.amount,
      currency: subscription.currency,
    });
  } catch (error: unknown) {
    return authErrorResponse(error);
  }
}
