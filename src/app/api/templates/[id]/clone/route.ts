import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * POST /api/templates/[id]/clone
 * Clone a template (system or user's own) as a new user_custom template.
 * This allows users to create editable copies of system templates.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    // Fetch the source template
    const source = await db.template.findFirst({
      where: { id, deletedAt: null },
    });

    if (!source) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // For user_custom templates, verify the user can clone it
    // (they can clone their own templates or any system template)
    if (source.type === "user_custom" && source.userId !== user.id) {
      return NextResponse.json(
        { error: "Cannot clone another user's template" },
        { status: 403 },
      );
    }

    // Create a clone as user_custom
    const cloned = await db.template.create({
      data: {
        userId: user.id,
        type: "user_custom",
        name: `${source.name} (Copy)`,
        subjectLine: source.subjectLine,
        htmlBody: source.htmlBody,
        triggerPoint: source.triggerPoint,
        tone: source.tone,
        isActive: true,
      },
    });

    return NextResponse.json({
      ...cloned,
      readOnly: false,
      clonedFrom: id,
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
