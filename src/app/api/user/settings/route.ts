import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/user/settings
 * Retrieve the current user's settings (Gmail credentials).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const settings = await db.userSettings.findUnique({
      where: { userId: user.id },
      select: {
        senderEmail: true,
        // Do NOT return the app password to the client
        senderAppPassword: false,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Check if app password is set without exposing it
    const fullSettings = await db.userSettings.findUnique({
      where: { userId: user.id },
      select: { senderAppPassword: true },
    });

    return NextResponse.json({
      senderEmail: settings?.senderEmail || "",
      hasAppPassword: !!fullSettings?.senderAppPassword,
      createdAt: settings?.createdAt || null,
      updatedAt: settings?.updatedAt || null,
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
 * POST /api/user/settings
 * Save or update the user's Gmail credentials.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { senderEmail, senderAppPassword } = body;

    if (!senderEmail) {
      return NextResponse.json(
        { error: "Sender email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(senderEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate Gmail app password if provided
    if (senderAppPassword && senderAppPassword.length < 16) {
      return NextResponse.json(
        { error: "Gmail App Password must be at least 16 characters" },
        { status: 400 }
      );
    }

    // Upsert user settings
    const settings = await db.userSettings.upsert({
      where: { userId: user.id },
      update: {
        senderEmail,
        ...(senderAppPassword ? { senderAppPassword } : {}),
      },
      create: {
        userId: user.id,
        senderEmail,
        ...(senderAppPassword ? { senderAppPassword } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      senderEmail: settings.senderEmail,
      hasAppPassword: !!settings.senderAppPassword,
      updatedAt: settings.updatedAt,
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
