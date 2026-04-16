import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, logAction } from "@/lib/auth";

/**
 * GET /api/templates/[id]
 * Get a single template. System templates are marked readOnly.
 * User templates are only accessible to their owners.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const template = await db.template.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { userId: null }, // system templates
          { userId: user.id }, // user's custom templates
        ],
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({
...template,
      readOnly: template.type === "system",
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
 * PUT /api/templates/[id]
 * Update a user custom template.
 * System templates cannot be edited (readOnly).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();

    const template = await db.template.findFirst({
      where: { id, deletedAt: null },
    });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // System templates are readOnly — cannot edit
    if (template.type === "system") {
      return NextResponse.json(
        { error: "System templates are read-only. Clone this template to create an editable copy." },
        { status: 403 },
      );
    }

    // Verify ownership for user_custom templates
    if (template.userId !== user.id) {
      return NextResponse.json({ error: "Cannot edit this template" }, { status: 403 });
    }

    const { name, subjectLine, htmlBody, triggerPoint, tone } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (subjectLine !== undefined) updateData.subjectLine = subjectLine;
    if (htmlBody !== undefined) updateData.htmlBody = htmlBody;
    if (triggerPoint !== undefined) updateData.triggerPoint = triggerPoint;
    if (tone !== undefined) updateData.tone = tone;

    const updated = await db.template.update({
      where: { id },
      data: updateData,
    });

    // Log the template update action
    await logAction({
      adminId: user.id,
      action: "update_template",
      targetUserId: user.id,
      previousValue: template,
      newValue: updated,
      notes: `User updated custom template: ${updated.name}`,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({
    ...updated,
      readOnly: false,
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
 * DELETE /api/templates/[id]
 * Soft delete a user custom template.
 * System templates cannot be deleted.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const template = await db.template.findFirst({
      where: { id, deletedAt: null },
    });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // System templates cannot be deleted
    if (template.type === "system") {
      return NextResponse.json(
        { error: "System templates cannot be deleted. You can only delete your own custom templates." },
        { status: 403 },
      );
    }

    if (template.userId !== user.id) {
      return NextResponse.json({ error: "Cannot delete this template" }, { status: 403 });
    }

    // Soft delete
    const deleted = await db.template.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Log the template deletion action
    await logAction({
      adminId: user.id,
      action: "delete_template",
      targetUserId: user.id,
      previousValue: template,
      notes: `User soft-deleted custom template: ${template.name}`,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({ success: true, message: "Template deleted" });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { statusCode: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
