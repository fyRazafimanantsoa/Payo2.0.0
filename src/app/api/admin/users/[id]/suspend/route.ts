import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/admin/users/[id]/suspend
 *
 * Suspend a user account.
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
          take: 1,
        },
      },
    });

    if (!user || user.deletedAt) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.isAdmin) {
      return NextResponse.json({ error: "Cannot suspend admin user" }, { status: 400 });
    }

    const previousStatus = user.subscriptionStatus;
    const activeSub = user.subscriptions[0];

    // Update user status
    const updatedUser = await db.user.update({
      where: { id },
      data: { subscriptionStatus: "suspended" },
    });

    // Cancel all active subscriptions
    if (activeSub) {
      await db.subscription.update({
        where: { id: activeSub.id },
        data: { status: "cancelled" },
      });
    }

    // Log admin action
    await db.adminLog.create({
      data: {
        adminId: admin.id,
        action: "suspend_user",
        targetUserId: id,
        previousValue: JSON.stringify({ subscriptionStatus: previousStatus }),
        newValue: JSON.stringify({ subscriptionStatus: "suspended" }),
        notes,
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
      },
    });

    const { hashedPassword: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword);
  } catch (error: unknown) {
    return authErrorResponse(error);
  }
}
