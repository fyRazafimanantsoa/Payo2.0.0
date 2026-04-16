import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, getSessionCookieOptions } from "@/lib/auth";

/**
 * POST /api/onboarding
 *
 * Legacy onboarding endpoint — now functions as registration.
 * Kept for backward compatibility with existing frontend.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, businessName, defaultReminderTone } = body;

    if (!email || !password || !businessName) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, businessName" },
        { status: 400 },
      );
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const trialDays = parseInt(process.env.TRIAL_DAYS || "14", 10);
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        hashedPassword,
        businessName,
        defaultReminderTone: defaultReminderTone || "friendly",
        planType: "trial",
        subscriptionStatus: "trial",
        trialEndsAt,
      },
    });

    // Create session
    const userAgent = request.headers.get("user-agent") || undefined;
    const token = await createSession(user.id, undefined, userAgent);

    const { hashedPassword: _, ...userWithoutPassword } = user;
    const cookieOptions = getSessionCookieOptions(false);

    const response = NextResponse.json(userWithoutPassword, { status: 201 });
    response.cookies.set(cookieOptions.name, token, cookieOptions);

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
