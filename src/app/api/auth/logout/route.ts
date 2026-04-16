import { NextRequest, NextResponse } from "next/server";
import { getSession, deleteSession, getSessionCookieOptions } from "@/lib/auth";

/**
 * POST /api/auth/logout
 *
 * Delete the current session and clear the session cookie.
 */
export async function POST(request: NextRequest) {
  try {
    // Get the session token from the cookie
    const cookieHeader = request.headers.get("cookie");
    let token: string | null = null;

    if (cookieHeader) {
      const match = cookieHeader.match(/payo_session=([^;]+)/);
      if (match) token = match[1];
    }

    // Delete session from database if token exists
    if (token) {
      await deleteSession(token);
    }

    // Clear the session cookie
    const cookieOptions = getSessionCookieOptions(false);

    const response = NextResponse.json({
      message: "Logged out successfully",
    });

    response.cookies.set(cookieOptions.name, "", {
      ...cookieOptions,
      maxAge: 0,
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
