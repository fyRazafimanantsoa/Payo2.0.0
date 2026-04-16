import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, logAction } from "@/lib/auth";

/**
 * GET /api/templates
 * List all templates (system + user's custom), excluding soft-deleted.
 * System templates are marked as readOnly.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const tone = searchParams.get("tone");
    const triggerPoint = searchParams.get("triggerPoint");

    const where: Record<string, unknown> = {
      deletedAt: null,
      isActive: true,
      OR: [
        { userId: null }, // system templates
        { userId: user.id }, // user's custom templates
      ],
    };
    if (type) where.type = type;
    if (tone) where.tone = tone;
    if (triggerPoint) where.triggerPoint = triggerPoint;

    const templates = await db.template.findMany({
      where,
      orderBy: [{ type: "asc" }, { triggerPoint: "asc" }],
    });

    // Mark system templates as readOnly
    const result = templates.map((t) => ({
      ...t,
      readOnly: t.type === "system",
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
 * POST /api/templates
 * Create a new custom template.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { name, subjectLine, htmlBody, triggerPoint, tone } = body;

    if (!name || !subjectLine || !htmlBody || !triggerPoint) {
      return NextResponse.json(
        { error: "Missing required fields: name, subjectLine, htmlBody, triggerPoint" },
        { status: 400 },
      );
    }

    const template = await db.template.create({
      data: {
        userId: user.id,
        type: "user_custom",
        name,
        subjectLine,
        htmlBody,
        triggerPoint,
        tone: tone || "friendly",
      },
    });

    // Log the template creation action
    await logAction({
      adminId: user.id,
      action: "create_template",
      targetUserId: user.id,
      notes: `User created custom template: ${template.name}`,
      newValue: template,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({
    ...template,
      readOnly: false,
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
