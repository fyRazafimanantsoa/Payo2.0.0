import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { db } from "@/lib/db";
import { differenceInDays } from "date-fns";

/**
 * GET /api/admin/stats
 *
 * Returns admin dashboard statistics.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count users by status
    const allUsers = await db.user.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { clients: true, invoices: true, subscriptions: true } },
        subscriptions: {
          where: { status: { not: "cancelled" } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter((u) => u.subscriptionStatus === "active").length;
    const trialUsers = allUsers.filter((u) => u.subscriptionStatus === "trial").length;
    const overdueSubscriptions = allUsers.filter((u) => u.subscriptionStatus === "overdue").length;
    const suspendedAccounts = allUsers.filter((u) => u.subscriptionStatus === "suspended").length;

    // Revenue this month from paid subscription history
    const paidThisMonth = await db.subscriptionHistory.findMany({
      where: {
        paidAt: { gte: monthStart },
      },
    });
    const revenueThisMonth = paidThisMonth.reduce((sum, h) => sum + h.amount, 0);

    // Users that need review (overdue > 30 days)
    const needsReview = allUsers.filter((u) => {
      const sub = u.subscriptions[0];
      if (!sub || !sub.overdueSince) return false;
      return differenceInDays(now, sub.overdueSince) > 30;
    });

    // Recent admin actions (last 20)
    const recentActions = await db.adminLog.findMany({
      take: 20,
      orderBy: { performedAt: "desc" },
      include: {
        admin: { select: { email: true } },
        targetUser: { select: { email: true } },
      },
    });

    return NextResponse.json({
      totalUsers,
      activeUsers,
      trialUsers,
      overdueSubscriptions,
      suspendedAccounts,
      revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
      needsReview: needsReview.length,
      needsReviewUsers: needsReview.map((u) => ({
        id: u.id,
        email: u.email,
        businessName: u.businessName,
        planType: u.planType,
        subscriptionStatus: u.subscriptionStatus,
        daysOverdue: u.subscriptions[0]?.overdueSince
          ? differenceInDays(now, u.subscriptions[0].overdueSince)
          : 0,
      })),
      recentActions: recentActions.map((log) => ({
        id: log.id,
        adminEmail: log.admin.email,
        targetEmail: log.targetUser.email,
        action: log.action,
        previousValue: log.previousValue,
        newValue: log.newValue,
        notes: log.notes,
        performedAt: log.performedAt,
      })),
    });
  } catch (error: unknown) {
    return authErrorResponse(error);
  }
}
