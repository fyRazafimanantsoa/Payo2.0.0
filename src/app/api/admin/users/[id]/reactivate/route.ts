import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/admin/users/[id]/reactivate
 *
 * Reactivate a suspended user account with a new pending subscription.
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
    });

    if (!user || user.deletedAt) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.subscriptionStatus !== "suspended") {
      return NextResponse.json(
        { error: "Can only reactivate suspended users" },
        { status: 400 },
      );
    }

    const previousStatus = user.subscriptionStatus;

    // Determine plan details
    const planType = user.planType === "trial" ? "starter" : user.planType;
    const billingCycle = "monthly";
    const amount = planType === "pro" ? 29 : 9;
    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

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
      },
    });

    // Update user
    const updatedUser = await db.user.update({
      where: { id },
      data: {
        subscriptionStatus: "active",
        planType,
      },
    });

    // Log admin action
    await db.adminLog.create({
      data: {
        adminId: admin.id,
        action: "reactivate_user",
        targetUserId: id,
        previousValue: JSON.stringify({ subscriptionStatus: previousStatus, planType: user.planType }),
        newValue: JSON.stringify({ subscriptionStatus: "active", planType }),
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
