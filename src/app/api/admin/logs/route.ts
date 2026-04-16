import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/admin/logs
 *
 * Admin logs with filters.
 * Query params: ?action=..., ?userId=...
 * Paginated, last 50.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "";
    const userId = searchParams.get("userId") || "";

    const where: Record<string, unknown> = {};

    if (action) {
      where.action = action;
    }

    if (userId) {
      where.targetUserId = userId;
    }

    const logs = await db.adminLog.findMany({
      where,
      take: 50,
      orderBy: { performedAt: "desc" },
      include: {
        admin: { select: { email: true, businessName: true } },
        targetUser: { select: { email: true, businessName: true } },
      },
    });

    return NextResponse.json(
      logs.map((log) => ({
        id: log.id,
        adminEmail: log.admin.email,
        adminBusinessName: log.admin.businessName,
        targetEmail: log.targetUser.email,
        targetBusinessName: log.targetUser.businessName,
        action: log.action,
        previousValue: log.previousValue,
        newValue: log.newValue,
        notes: log.notes,
        performedAt: log.performedAt,
        ipAddress: log.ipAddress,
      })),
    );
  } catch (error: unknown) {
    return authErrorResponse(error);
  }
}
