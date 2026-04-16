import { NextRequest, NextResponse } from "next/server";
import { getSession, requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

/**
 * GET /api/user
 *
 * Get the current authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSession(request);

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { hashedPassword: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/user
 *
 * Update the current user's profile or password.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    // Update business name
    if (body.businessName !== undefined) {
      updateData.businessName = String(body.businessName).trim();
    }

    // Update locale
    if (body.locale !== undefined) {
      updateData.locale = String(body.locale);
    }

    // Update invoice pattern
    if (body.invoicePattern !== undefined) {
      updateData.invoicePattern = String(body.invoicePattern);
    }

    // Update default reminder tone
    if (body.defaultReminderTone !== undefined) {
      const validTones = ["friendly", "neutral", "firm"];
      if (!validTones.includes(body.defaultReminderTone)) {
        return NextResponse.json(
          { error: "Invalid reminder tone. Must be friendly, neutral, or firm." },
          { status: 400 },
        );
      }
      updateData.defaultReminderTone = body.defaultReminderTone;
    }

    // Change password
    if (body.newPassword) {
      if (!body.currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to change password." },
          { status: 400 },
        );
      }

      if (String(body.newPassword).length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters." },
          { status: 400 },
        );
      }

      // Verify current password
      const currentPasswordValid = await bcrypt.compare(
        String(body.currentPassword),
        user.hashedPassword,
      );

      if (!currentPasswordValid) {
        return NextResponse.json(
          { error: "Current password is incorrect." },
          { status: 401 },
        );
      }

      updateData.hashedPassword = await bcrypt.hash(String(body.newPassword), 12);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: updateData,
    });

    const { hashedPassword: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json(userWithoutPassword);
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
 * DELETE /api/user
 *
 * Soft-delete the current user's account.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Soft delete the user
    await db.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        subscriptionStatus: "cancelled",
      },
    });

    return NextResponse.json({ message: "Account deleted successfully." });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { statusCode: number; message: string };
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
