import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { calculateTriggerPoint, calculateNextReminderDate } from "@/lib/templates/template-resolver";

interface ColumnMapping {
  clientName: string;
  clientEmail: string;
  amount: string;
  dueDate: string;
  invoiceNumber?: string;
  currency?: string;
}

/**
 * POST /api/csv/commit
 *
 * Accepts rows with column mapping, finds/creates clients,
 * creates invoices, and returns results.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { rows, columnMapping } = body as {
      rows: Record<string, string>[];
      columnMapping: ColumnMapping;
    };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "rows must be a non-empty array" }, { status: 400 });
    }

    if (!columnMapping) {
      return NextResponse.json({ error: "columnMapping is required" }, { status: 400 });
    }

    let created = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];

        const clientName = row[columnMapping.clientName]?.trim();
        const email = row[columnMapping.clientEmail]?.trim();
        const amountStr = row[columnMapping.amount]?.trim();
        const dueDateStr = row[columnMapping.dueDate]?.trim();
        const invoiceNumber = columnMapping.invoiceNumber
          ? row[columnMapping.invoiceNumber]?.trim()
          : `INV-${Date.now()}-${i}`;
        const currency = columnMapping.currency
          ? row[columnMapping.currency]?.trim()
          : "USD";

        if (!clientName || !email || !amountStr || !dueDateStr) {
          errors.push(`Row ${i + 1}: Missing required fields (name, email, amount, or dueDate)`);
          continue;
        }

        // Parse amount: strip currency symbols and commas
        const cleanAmount = amountStr.replace(/[$€£,]/g, "").trim();
        const amountDue = parseFloat(cleanAmount);
        if (isNaN(amountDue)) {
          errors.push(`Row ${i + 1}: Could not parse amount "${amountStr}"`);
          continue;
        }

        // Parse date
        const dueDate = parseDate(dueDateStr);
        if (!dueDate) {
          errors.push(`Row ${i + 1}: Could not parse date "${dueDateStr}"`);
          continue;
        }

        // Find or create client by email (excluding soft-deleted)
        let client = await db.client.findFirst({
          where: { primaryEmail: email, userId: user.id, deletedAt: null },
        });

        if (!client) {
          client = await db.client.create({
            data: {
              userId: user.id,
              name: clientName,
              primaryEmail: email,
              ccEmails: "[]",
            },
          });
        }

        // Calculate trigger point and status
        const triggerPoint = calculateTriggerPoint(dueDate);
        const statusMap: Record<string, string> = {
          pre_due_7: "upcoming",
          pre_due_3: "upcoming",
          due_today: "pending",
          overdue_3: "overdue_1",
          overdue_7: "overdue_2",
          overdue_14: "overdue_2",
          overdue_21: "overdue_2",
          overdue_30: "overdue_2",
          final_notice: "overdue_2",
        };
        const currentStatus = statusMap[triggerPoint] || "upcoming";

        await db.invoice.create({
          data: {
            userId: user.id,
            clientId: client.id,
            invoiceNumber,
            amountDue,
            currency: currency || "USD",
            issueDate: new Date(),
            dueDate,
            currentStatus,
            nextReminderDate: calculateNextReminderDate(dueDate, triggerPoint),
          },
        });

        created++;
      } catch (rowError: unknown) {
        const msg = rowError instanceof Error ? rowError.message : "Unknown error";
        errors.push(`Row ${i + 1}: ${msg}`);
      }
    }

    return NextResponse.json({
      created,
      errors,
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
 * Try to parse a date string in DD/MM/YYYY, MM/DD/YYYY, or ISO format.
 */
function parseDate(dateStr: string): Date | null {
  // Try DD/MM/YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime()) && date.getDate() === day) {
      return date;
    }
  }

  // Try MM/DD/YYYY
  const mdyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const month = parseInt(mdyMatch[1], 10) - 1;
    const day = parseInt(mdyMatch[2], 10);
    const year = parseInt(mdyMatch[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime()) && date.getDate() === day) {
      return date;
    }
  }

  // Try ISO format
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  return null;
}
