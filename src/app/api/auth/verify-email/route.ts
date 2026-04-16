import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * POST /api/auth/verify-email
 *
 * Placeholder endpoint that sets email_verified=true for the current user.
 * In production, this would verify a token sent to the user's email.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    if (user.emailVerified) {
      return NextResponse.json({
        message: "Email is already verified",
        verified: true,
      });
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Email verified successfully",
      verified: true,
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
