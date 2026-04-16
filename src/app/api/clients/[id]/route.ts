import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin, logAction } from "@/lib/auth";

/** Simple email regex */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/clients/[id]
 * Get a single client with its invoices.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const client = await db.client.findFirst({
      where: { id, userId: user.id, deletedAt: null },
      include: {
        invoices: {
          where: { deletedAt: null },
          orderBy: { dueDate: "asc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Also fetch user's custom templates for the template override dropdown
    const userCustomTemplates = await db.template.findMany({
      where: {
        userId: client.userId,
        type: "user_custom",
        deletedAt: null,
      },
      select: { id: true, name: true },
    });

    return NextResponse.json({
      ...client,
      templates: userCustomTemplates,
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

/**
 * PATCH /api/clients/[id]
 * Update a client. Verifies ownership. emailStatus changes require admin.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const { name, primaryEmail, ccEmails, assignedTemplateId, preferredCurrency, emailStatus, locale, notes, skipReminderReview } = body;

    // Verify client belongs to the authenticated user
    const client = await db.client.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // emailStatus changes require admin
    if (emailStatus !== undefined && emailStatus !== client.emailStatus) {
      await requireAdmin(request);
    }

    // Validate email format if changing
    if (primaryEmail !== undefined && !EMAIL_REGEX.test(primaryEmail)) {
      return NextResponse.json(
        { error: "Invalid email format for primaryEmail" },
        { status: 400 },
      );
    }

    // Validate cc emails if provided
    if (ccEmails !== undefined) {
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

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (primaryEmail !== undefined) updateData.primaryEmail = primaryEmail;
    if (ccEmails !== undefined) {
      if (Array.isArray(ccEmails)) {
        updateData.ccEmails = JSON.stringify(ccEmails);
      } else {
        updateData.ccEmails = JSON.stringify(
          ccEmails.split(",").map((e: string) => e.trim()).filter(Boolean),
        );
      }
    }
    if (assignedTemplateId !== undefined) updateData.assignedTemplateId = assignedTemplateId || null;
    if (preferredCurrency !== undefined) updateData.preferredCurrency = preferredCurrency;
    if (emailStatus !== undefined) updateData.emailStatus = emailStatus;
    if (locale !== undefined) updateData.locale = locale;
    if (notes !== undefined) updateData.notes = notes;
    if (skipReminderReview !== undefined) updateData.skipReminderReview = !!skipReminderReview;

    const updated = await db.client.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { invoices: true } },
      },
    });

    // Log the update action
    await logAction({
      adminId: user.id,
      action: "update_client",
      targetUserId: user.id,
      previousValue: client,
      newValue: updated,
      notes: `User updated client: ${updated.name}`,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    // Compute outstanding amount for this client
    const sumResult = await db.invoice.aggregate({
      where: {
        clientId: id,
        currentStatus: { notIn: ["paid", "uncollectible"] },
        deletedAt: null,
      },
      _sum: { amountDue: true },
    });

    return NextResponse.json({
      ...updated,
      outstandingAmount: sumResult._sum.amountDue ?? 0,
      invoiceCount: updated._count.invoices,
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

/**
 * DELETE /api/clients/[id]
 * Soft delete a client AND all their invoices.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    // Verify client belongs to the authenticated user
    const client = await db.client.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const now = new Date();

    // Soft delete all invoices belonging to this client
    await db.invoice.updateMany({
      where: {
        clientId: id,
        deletedAt: null,
      },
      data: { deletedAt: now },
    });

    // Soft delete the client
    const deleted = await db.client.update({
      where: { id },
      data: { deletedAt: now },
    });

    // Log the deletion action
    await logAction({
      adminId: user.id,
      action: "delete_client",
      targetUserId: user.id,
      previousValue: client,
      notes: `User soft-deleted client: ${client.name}`,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({ success: true, message: "Client and all associated invoices deleted" });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { statusCode: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
