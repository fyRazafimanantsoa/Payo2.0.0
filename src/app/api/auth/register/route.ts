import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, getSessionCookieOptions, logAction } from "@/lib/auth";

/**
 * POST /api/auth/register
 *
 * Register a new user account.
 * Input: email, password, business_name, default_reminder_tone (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, business_name, default_reminder_tone } = body;

    if (!email || !password || !business_name) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, business_name" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 },
      );
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Calculate trial end date
    const trialDays = parseInt(process.env.TRIAL_DAYS || "14", 10);
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    console.log(`[Register] Creating user: ${email}`);

    // Create user
    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        hashedPassword,
        businessName: business_name.trim(),
        defaultReminderTone: default_reminder_tone || "friendly",
        planType: "trial",
        subscriptionStatus: "trial",
        trialEndsAt,
      },
    });

    console.log(`[Register] User created: ${user.id}`);

    // Create session
    const userAgent = request.headers.get("user-agent") || undefined;
    const token = await createSession(user.id, undefined, userAgent);

    console.log(`[Register] Session created for user: ${user.id}`);

    // Log the registration action
    await logAction({
      adminId: user.id, // User is their own admin for this action
      action: "user_registered",
      targetUserId: user.id,
      notes: `User registered with business name: ${user.businessName}`,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    // Return user (without password) and set session cookie
    const { hashedPassword: _, ...userWithoutPassword } = user;
    const cookieOptions = getSessionCookieOptions(false);

    const response = NextResponse.json(
      { user: userWithoutPassword, message: "Account created successfully" },
      { status: 201 },
    );

    response.cookies.set(cookieOptions.name, token, cookieOptions);

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
