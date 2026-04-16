import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, getSessionCookieOptions, logAction } from "@/lib/auth";

/**
 * POST /api/auth/login
 *
 * Authenticate a user and create a session.
 * Input: email, password, remember_me (optional, default false)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, remember_me } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing required fields: email, password" },
        { status: 400 },
      );
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Check if user is soft-deleted
    if (user.deletedAt) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Check if user is suspended
    if (user.subscriptionStatus === "suspended") {
      return NextResponse.json(
        { error: "Your account has been suspended. Please contact support." },
        { status: 403 },
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Create session
    const userAgent = request.headers.get("user-agent") || undefined;
    const token = await createSession(user.id, undefined, userAgent, !!remember_me);

    // Log the login action
    await logAction({
      adminId: user.id,
      action: "user_login",
      targetUserId: user.id,
      notes: `User logged in from ${userAgent || "unknown"}`,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    // Return user (without password) and set session cookie
    const { hashedPassword: _, ...userWithoutPassword } = user;
    const cookieOptions = getSessionCookieOptions(!!remember_me);

    const response = NextResponse.json({
      user: userWithoutPassword,
      message: "Login successful",
    });

    response.cookies.set(cookieOptions.name, token, cookieOptions);

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
