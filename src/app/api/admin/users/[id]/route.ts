import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/admin/users/[id]
 *
 * Full user detail with subscription, invoices, clients.
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
      include: {
        subscriptions: {
          where: { status: { not: "cancelled" } },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        clients: {
          where: { deletedAt: null },
          include: {
            _count: { select: { invoices: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        invoices: {
          where: { deletedAt: null },
          include: { client: { select: { name: true, primaryEmail: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        subscriptionHistory: {
          orderBy: { paidAt: "desc" },
          take: 20,
        },
      },
    });

    if (!user || user.deletedAt) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { hashedPassword: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword);
  } catch (error: unknown) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/admin/users/[id]
 *
 * Soft delete user, all their clients, invoices, templates, and cancel subscriptions.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;

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
      return NextResponse.json({ error: "Cannot delete admin user" }, { status: 400 });
    }

    const now = new Date();

    // Soft delete user
    await db.user.update({
      where: { id },
      data: {
        deletedAt: now,
        subscriptionStatus: "cancelled",
      },
    });

    // Soft delete all their clients
    await db.client.updateMany({
      where: { userId: id },
      data: { deletedAt: now },
    });

    // Soft delete all their invoices
    await db.invoice.updateMany({
      where: { userId: id },
      data: { deletedAt: now },
    });

    // Soft delete their custom templates
    await db.template.updateMany({
      where: { userId: id },
      data: { deletedAt: now },
    });

    // Cancel all active subscriptions
    await db.subscription.updateMany({
      where: { userId: id, status: { not: "cancelled" } },
      data: { status: "cancelled" },
    });

    // Log admin action
    await db.adminLog.create({
      data: {
        adminId: admin.id,
        action: "delete_user",
        targetUserId: id,
        previousValue: JSON.stringify({
          email: user.email,
          businessName: user.businessName,
          planType: user.planType,
          subscriptionStatus: user.subscriptionStatus,
        }),
        notes: "User soft-deleted by admin",
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
      },
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error: unknown) {
    return authErrorResponse(error);
  }
}
