import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, logAction } from "@/lib/auth";

/** Plan limits for max_clients */
const PLAN_CLIENT_LIMITS: Record<string, number> = {
  trial: 10,
  starter: 25,
  pro: 999999,
};

/** Simple email regex */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/clients
 * List all clients for the authenticated user, excluding soft-deleted.
 * Supports query params: ?search=..., ?status=active|bounced|complained
 * For each client, includes: total outstanding amount, invoice count
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {
      userId: user.id,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { primaryEmail: { contains: search } },
      ];
    }

    if (status && ["active", "bounced", "complained"].includes(status)) {
      where.emailStatus = status;
    }

    const clients = await db.client.findMany({
      where,
      include: {
        _count: {
          select: { invoices: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Compute total outstanding per client via aggregation (non-paid, non-terminal)
    const clientIds = clients.map((c) => c.id);
    const sums = clientIds.length > 0
      ? await db.invoice.groupBy({
          by: ["clientId"],
          where: {
            clientId: { in: clientIds },
            currentStatus: { notIn: ["paid", "uncollectible"] },
            deletedAt: null,
          },
          _sum: { amountDue: true },
        })
      : [];

    const sumMap = new Map(sums.map((s) => [s.clientId, s._sum.amountDue ?? 0]));

    const result = clients.map((c) => ({
      ...c,
      outstandingAmount: sumMap.get(c.id) ?? 0,
      invoiceCount: c._count.invoices,
    }));

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { statusCode: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/clients
 * Create a new client for the authenticated user.
 * Checks plan limits, validates email format.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { name, primaryEmail, ccEmails, preferredCurrency, locale, notes } = body;

    if (!name || !primaryEmail) {
      return NextResponse.json(
        { error: "Missing required fields: name, primaryEmail" },
        { status: 400 },
      );
    }

    // Validate email format
    if (!EMAIL_REGEX.test(primaryEmail)) {
      return NextResponse.json(
        { error: "Invalid email format for primaryEmail" },
        { status: 400 },
      );
    }

    // Validate cc emails if provided
    if (ccEmails) {
      const emails: string[] = Array.isArray(ccEmails)
        ? ccEmails
        : ccEmails.split(",").map((e: string) => e.trim()).filter(Boolean);
      for (const email of emails) {
        if (!EMAIL_REGEX.test(email)) {
          return NextResponse.json(
            { error: `Invalid email format in cc_emails: ${email}` },
            { status: 400 },
          );
        }
      }
    }

    // Check plan limits
    const maxClients = PLAN_CLIENT_LIMITS[user.planType] || PLAN_CLIENT_LIMITS.trial;
    const currentCount = await db.client.count({
      where: { userId: user.id, deletedAt: null },
    });

    if (currentCount >= maxClients) {
      return NextResponse.json(
        { error: `Client limit reached (${maxClients} for ${user.planType} plan). Please upgrade your plan.` },
        { status: 403 },
      );
    }

    const client = await db.client.create({
      data: {
        userId: user.id,
        name,
        primaryEmail,
        ccEmails: ccEmails
          ? JSON.stringify(Array.isArray(ccEmails) ? ccEmails : ccEmails.split(",").map((e: string) => e.trim()).filter(Boolean))
          : "[]",
        preferredCurrency: preferredCurrency || "USD",
        locale: locale || null,
        notes: notes || null,
      },
      include: {
        _count: { select: { invoices: true } },
      },
    });

    // Log the client creation action
    await logAction({
      adminId: user.id,
      action: "create_client",
      targetUserId: user.id,
      notes: `User created client: ${client.name} (${client.primaryEmail})`,
      newValue: client,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({
    ...client,
      outstandingAmount: 0,
      invoiceCount: 0,
    }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { statusCode: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
