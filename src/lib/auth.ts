import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { User } from "@prisma/client";
import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "payo_session";

/**
 * Get the current session token from the request cookies.
 */
async function getSessionToken(request?: Request): Promise<string | null> {
  try {
    // Try from cookie header directly (works in both route handlers and middleware)
    const cookieHeader = request?.headers?.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
      if (match) return match[1];
    }
  } catch {
    // fall through to cookies() API
  }

  try {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Get the current authenticated user from the session cookie.
 * Returns null if not authenticated or session is expired.
 */
export async function getSession(request?: Request): Promise<User | null> {
  const token = await getSessionToken(request);
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { id: token },
    include: { user: true },
  });

  if (!session) return null;

  // Check if session is expired
  if (session.expiresAt < new Date()) {
    // Clean up expired session
    await db.session.delete({ where: { id: session.id } });
    return null;
  }

  // Check if user is soft-deleted
  if (session.user.deletedAt) return null;

  return session.user;
}

/**
 * Require authentication. Returns the authenticated user or throws an error response.
 */
export async function requireAuth(request?: Request): Promise<User> {
  const user = await getSession(request);
  if (!user) {
    throw new AuthError("Authentication required", 401);
  }
  return user;
}

/**
 * Require admin access. Returns the admin user or throws an error response.
 */
export async function requireAdmin(request?: Request): Promise<User> {
  const user = await requireAuth(request);
  if (!user.isAdmin) {
    throw new AuthError("Admin access required", 403);
  }
  return user;
}

/**
 * Create a new session for a user. Returns the session token.
 */
export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string,
  rememberMe: boolean = false,
): Promise<string> {
  const expiryHours = parseInt(process.env.SESSION_EXPIRY_HOURS || "24", 10);
  const rememberDays = parseInt(process.env.SESSION_REMEMBER_ME_DAYS || "7", 10);
  const hours = rememberMe ? rememberDays * 24 : expiryHours;

  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  const session = await db.session.create({
    data: {
      userId,
      tokenHash: "session", // Placeholder — the session ID itself is the token
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  return session.id;
}

/**
 * Delete a session by token.
 */
export async function deleteSession(token: string): Promise<void> {
  await db.session.delete({ where: { id: token } }).catch(() => {
    // Session may already be deleted
  });
}

/**
 * Delete all sessions for a user (e.g., on password change).
 */
export async function deleteUserSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}

/**
 * Get session cookie options for Next.js response.
 */
export function getSessionCookieOptions(rememberMe: boolean = false) {
  const maxAge = rememberMe
    ? parseInt(process.env.SESSION_REMEMBER_ME_DAYS || "7", 10) * 24 * 60 * 60
    : parseInt(process.env.SESSION_EXPIRY_HOURS || "24", 10) * 60 * 60;

  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/**
 * Log an action to the AdminLog table.
 */
export async function logAction({
  adminId,
  action,
  targetUserId,
  targetSubscriptionId,
  previousValue,
  newValue,
  notes,
  ipAddress,
}: {
  adminId: string;
  action: string;
  targetUserId: string;
  targetSubscriptionId?: string;
  previousValue?: any;
  newValue?: any;
  notes?: string;
  ipAddress?: string;
}) {
  try {
    await db.adminLog.create({
      data: {
        adminId,
        action,
        targetUserId,
        targetSubscriptionId,
        previousValue: previousValue ? JSON.stringify(previousValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        notes,
        ipAddress,
      },
    });
  } catch (error) {
    console.error("[logAction] Failed to create log:", error);
  }
}

/**
 * Custom error class for auth failures.
 */
export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AuthError";
  }
}

/**
 * Helper to create an error response from an AuthError.
 */
export function authErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  const message = error instanceof Error ? error.message : "Internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}
