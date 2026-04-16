import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/admin/users
 *
 * List all users with search and filters.
 * Query params: ?search=..., ?status=..., ?plan=...
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "";
    const plan = searchParams.get("plan") || "";

    const where: Record<string, unknown> = { deletedAt: null };

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { businessName: { contains: search } },
      ];
    }

    if (status) {
      where.subscriptionStatus = status;
    }

    if (plan) {
      where.planType = plan;
    }

    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { clients: true, invoices: true } },
        subscriptions: {
          where: { status: { not: "cancelled" } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const result = users.map((u) => {
      const { hashedPassword: _, ...userWithoutPassword } = u;
      const activeSub = u.subscriptions[0];
      return {
        ...userWithoutPassword,
        client_count: u._count.clients,
        invoice_count: u._count.invoices,
        subscription: activeSub
          ? {
              id: activeSub.id,
              planType: activeSub.planType,
              amount: activeSub.amount,
              currency: activeSub.currency,
              billingCycle: activeSub.billingCycle,
              dueDate: activeSub.dueDate,
              status: activeSub.status,
              overdueSince: activeSub.overdueSince,
              paidAt: activeSub.paidAt,
            }
          : null,
      };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    return authErrorResponse(error);
  }
}
