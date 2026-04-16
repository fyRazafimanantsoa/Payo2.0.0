import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addDays, differenceInDays } from "date-fns";

/**
 * POST /api/cron/backoffice
 *
 * Daily backoffice cron job (v3 spec Section 5.2).
 *
 * 1. Check trial expirations
 * 2. Send subscription payment reminders
 * 3. Flag suspension candidates (overdue > 30 days)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    let expiredTrials = 0;
    let remindersSent = 0;
    const needsReviewUsers: Array<{
      id: string;
      email: string;
      businessName: string;
      planType: string;
      daysOverdue: number;
    }> = [];

    // =========================================================================
    // 1. CHECK TRIAL EXPIRATIONS
    // Users where trial_ends_at < NOW() AND subscription_status = "trial"
    // =========================================================================
    const expiredTrialsList = await db.user.findMany({
      where: {
        trialEndsAt: { lt: now },
        subscriptionStatus: "trial",
        deletedAt: null,
      },
    });

    for (const user of expiredTrialsList) {
      // Set subscription_status = "overdue", plan_type = "starter"
      await db.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: "overdue",
          planType: "starter",
        },
      });

      // Create subscription record with due_date = TODAY()
      await db.subscription.create({
        data: {
          userId: user.id,
          planType: "starter",
          amount: 9,
          currency: "USD",
          billingCycle: "monthly",
          dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          status: "pending",
          overdueSince: now,
          nextReminderDate: addDays(now, 3),
        },
      });

      console.log(`[BACKOFFICE CRON] Trial expired for ${user.email} - set to overdue/starter`);
      expiredTrials++;
    }

    // =========================================================================
    // 2. SEND SUBSCRIPTION PAYMENT REMINDERS
    // Subscriptions where status IN ("pending", "overdue") AND nextReminderDate <= TODAY()
    // =========================================================================
    const subscriptionsNeedingReminder = await db.subscription.findMany({
      where: {
        status: { in: ["pending", "overdue"] },
        nextReminderDate: { lte: now },
      },
      include: {
        user: true,
      },
    });

    for (const sub of subscriptionsNeedingReminder) {
      if (!sub.user || sub.user.deletedAt) continue;

      const payoneerEmail = process.env.PAYONEER_EMAIL || "payments@payo.com";

      console.log("=== BACKOFFICE SUBSCRIPTION REMINDER ===");
      console.log(`ADMIN_REMINDER_WOULD_BE_SENT to: ${sub.user.email}`);
      console.log(`Business: ${sub.user.businessName}`);
      console.log(`Plan: ${sub.planType} (${sub.billingCycle})`);
      console.log(`Amount: $${sub.amount} ${sub.currency}`);
      console.log(`Due Date: ${sub.dueDate}`);
      console.log(`Status: ${sub.status}`);
      console.log(`Payment Email: ${payoneerEmail}`);
      console.log("=======================================");

      // Compute nextReminderDate
      let nextReminderDate: Date;
      if (sub.status === "pending") {
        nextReminderDate = addDays(now, 3);
      } else if (sub.overdueSince) {
        const daysOverdue = differenceInDays(now, sub.overdueSince);
        nextReminderDate = daysOverdue >= 14 ? addDays(now, 3) : addDays(now, 5);
      } else {
        nextReminderDate = addDays(now, 5);
      }

      // Update subscription
      await db.subscription.update({
        where: { id: sub.id },
        data: {
          lastReminderSentAt: now,
          nextReminderDate,
        },
      });

      remindersSent++;
    }

    // =========================================================================
    // 3. FLAG SUSPENSION CANDIDATES
    // Subscriptions where overdue_since < NOW() - 30 days
    // =========================================================================
    const thirtyDaysAgo = addDays(now, -30);
    const suspensionCandidates = await db.subscription.findMany({
      where: {
        status: { in: ["pending", "overdue"] },
        overdueSince: { lt: thirtyDaysAgo },
      },
      include: {
        user: true,
      },
    });

    for (const sub of suspensionCandidates) {
      if (!sub.user || !sub.overdueSince || sub.user.deletedAt || sub.user.subscriptionStatus === "suspended") continue;
      const daysOverdue = differenceInDays(now, sub.overdueSince);
      needsReviewUsers.push({
        id: sub.user.id,
        email: sub.user.email,
        businessName: sub.user.businessName,
        planType: sub.planType,
        daysOverdue,
      });
    }

    return NextResponse.json({
      expiredTrials,
      remindersSent,
      needsReview: needsReviewUsers.length,
      needsReviewUsers,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
