import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { differenceInDays } from "date-fns";

/**
 * GET /api/dashboard/stats
 * Dashboard statistics for the authenticated user.
 *
 * Includes:
 * - Total outstanding (sum of non-paid invoices)
 * - Total overdue count
 * - Pending confirmation count
 * - Paid this month count & amount
 * - Failed reminders this week (from reminder_logs)
 * - Plan info and trial status
 * - Grace period banner data
 * - Recent invoices
 * - Action required items
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const now = new Date();

    // All active (non-terminal) statuses that represent unpaid invoices
    const activeStatuses = ["upcoming", "pending", "overdue_1", "overdue_2", "pending_confirmation"];

    const invoices = await db.invoice.findMany({
      where: {
        userId: user.id,
        currentStatus: { in: activeStatuses },
        deletedAt: null,
      },
      include: { client: true },
    });

    // Total outstanding (sum of all active invoices)
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.amountDue, 0);

    // Awaiting confirmation count
    const awaitingConfirmation = invoices.filter((inv) => inv.currentStatus === "pending_confirmation").length;

    // Overdue count (overdue_1 or overdue_2)
    const overdueCount = invoices.filter(
      (inv) => inv.currentStatus === "overdue_1" || inv.currentStatus === "overdue_2",
    ).length;

    // Total clients
    const totalClients = await db.client.count({
      where: { userId: user.id, deletedAt: null },
    });

    // Paid this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const paidInvoices = await db.invoice.findMany({
      where: {
        userId: user.id,
        currentStatus: "paid",
        updatedAt: { gte: startOfMonth, lt: endOfMonth },
        deletedAt: null,
      },
    });
    const paidThisMonthAmount = paidInvoices.reduce((sum, inv) => sum + inv.amountDue, 0);
    const paidThisMonthCount = paidInvoices.length;

    // Failed reminders this week (from reminder_logs)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const failedRemindersThisWeek = await db.reminderLog.count({
      where: {
        userId: user.id,
        status: "failed",
        sentAt: { gte: oneWeekAgo },
      },
    });

    // Plan info and trial status
    const planInfo = {
      planType: user.planType,
      subscriptionStatus: user.subscriptionStatus,
      isTrial: user.planType === "trial",
      trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
      emailVerified: user.emailVerified,
    };

    // Grace period banner data
    let graceBanner: {
      type: string;
      message: string;
      daysRemaining?: number;
      daysOverdue?: number;
    } | null = null;

    if (user.planType === "trial" && user.trialEndsAt) {
      const daysUntilExpiry = differenceInDays(user.trialEndsAt, now);
      if (daysUntilExpiry <= 0) {
        graceBanner = {
          type: "trial_expired",
          message: "Your trial has expired. Upgrade to continue using Payo.",
          daysOverdue: Math.abs(daysUntilExpiry),
        };
      } else if (daysUntilExpiry <= 3) {
        graceBanner = {
          type: "trial_expiring",
          message: `Your trial expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}. Upgrade now to avoid losing access.`,
          daysRemaining: daysUntilExpiry,
        };
      } else if (daysUntilExpiry <= 7) {
        graceBanner = {
          type: "trial_warning",
          message: `Your trial expires in ${daysUntilExpiry} days. Consider upgrading to a paid plan.`,
          daysRemaining: daysUntilExpiry,
        };
      }
    }

    if (user.subscriptionStatus === "suspended") {
      graceBanner = {
        type: "suspended",
        message: "Your account has been suspended. Please contact support.",
      };
    }

    if (!user.emailVerified) {
      graceBanner = {
        type: "unverified_email",
        message: "Please verify your email address to unlock full features.",
      };
    }

    // Plan limits info
    const planLimits = {
      maxClients: user.planType === "trial" ? 10 : user.planType === "starter" ? 25 : 999999,
      maxInvoices: user.planType === "trial" ? 20 : user.planType === "starter" ? 100 : 999999,
    };

    const currentClients = await db.client.count({ where: { userId: user.id, deletedAt: null } });
    const currentInvoices = await db.invoice.count({ where: { userId: user.id, deletedAt: null } });

    // Action required: invoices in pending_confirmation for over 5 days
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const actionRequiredRaw = await db.invoice.findMany({
      where: {
        userId: user.id,
        currentStatus: "pending_confirmation",
        updatedAt: { lt: fiveDaysAgo },
        deletedAt: null,
      },
      include: { client: true },
      orderBy: { updatedAt: "asc" },
    });

    const actionRequired = actionRequiredRaw.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.client.name,
      amountDue: inv.amountDue,
      currency: inv.currency,
      dueDate: inv.dueDate.toISOString(),
      daysPending: Math.max(0, differenceInDays(now, inv.updatedAt)),
    }));

    // Recent invoices (last 10, all statuses)
    const recentInvoices = await db.invoice.findMany({
      where: { userId: user.id, deletedAt: null },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const recentInvoicesFormatted = recentInvoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amountDue: inv.amountDue,
      currency: inv.currency,
      dueDate: inv.dueDate.toISOString(),
      currentStatus: inv.currentStatus,
      client: { name: inv.client.name },
    }));

    return NextResponse.json({
      totalOutstanding,
      overdueCount,
      awaitingConfirmation,
      paidThisMonthCount,
      paidThisMonthAmount,
      failedRemindersThisWeek,
      totalClients,
      planInfo,
      graceBanner,
      planUsage: {
        clients: { current: currentClients, max: planLimits.maxClients },
        invoices: { current: currentInvoices, max: planLimits.maxInvoices },
      },
      actionRequired,
      recentInvoices: recentInvoicesFormatted,
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
