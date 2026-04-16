import { PrismaClient, Template } from "@prisma/client";
import { format, differenceInDays, addDays, subDays } from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Valid tone values recognised by Payo's template system. */
export type ReminderTone = "friendly" | "neutral" | "firm";

/** All trigger points in the reminder lifecycle, ordered chronologically. */
export type TriggerPoint =
  | "pre_due_7"
  | "pre_due_3"
  | "due_today"
  | "overdue_3"
  | "overdue_7"
  | "overdue_14"
  | "overdue_21"
  | "overdue_30"
  | "final_notice"
  | "consolidated_weekly"
  | "pending_confirmation"
  | "payment_confirmed"
  | "write_off_notice";

/** Variables that can be injected into a template's HTML body. */
export interface TemplateVariables {
  client_name: string;
  freelancer_name: string;
  amount_due: string;
  currency: string;
  due_date: string;
  invoice_number: string;
  days_overdue?: string;
  invoice_list?: string;
}

// ---------------------------------------------------------------------------
// 1. resolveTemplate – 3-tier template resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the best-matching Template for a given client and trigger point using
 * a 3-tier fallback strategy:
 *
 *  **Tier 1 – Client Override**: If the Client record has an `assignedTemplateId`
 *  and that template's `triggerPoint` matches, use it.
 *
 *  **Tier 2 – User Custom**: Look for a template owned by the client's user where
 *  `type = "user_custom"` and `triggerPoint` matches.
 *
 *  **Tier 3 – System Fallback**: Look for a system template (`userId IS NULL`,
 *  `type = "system"`) where `triggerPoint` and `tone` both match.
 */
export async function resolveTemplate(
  db: PrismaClient,
  clientId: string,
  triggerPoint: string,
  userDefaultTone: ReminderTone,
): Promise<Template | null> {
  // Fetch the client (and its user) first
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { userId: true, assignedTemplateId: true },
  });

  if (!client) return null;

  // ---- Tier 1: Client Override ---------------------------------------------
  if (client.assignedTemplateId) {
    const assigned = await db.template.findFirst({
      where: { id: client.assignedTemplateId, deletedAt: null },
    });

    if (assigned && assigned.triggerPoint === triggerPoint) {
      return assigned;
    }
  }

  // ---- Tier 2: User Custom -------------------------------------------------
  const userCustom = await db.template.findFirst({
    where: {
      userId: client.userId,
      type: "user_custom",
      triggerPoint,
      deletedAt: null,
    },
  });

  if (userCustom) return userCustom;

  // ---- Tier 3: System Fallback ---------------------------------------------
  const systemTemplate = await db.template.findFirst({
    where: {
      userId: null,
      type: "system",
      triggerPoint,
      tone: userDefaultTone,
      deletedAt: null,
      isActive: true,
    },
  });

  return systemTemplate ?? null;
}

// ---------------------------------------------------------------------------
// 2. injectVariables – replace {{variable}} placeholders in HTML
// ---------------------------------------------------------------------------

/**
 * Replace all `{{variable_name}}` placeholders in an HTML template body with
 * the supplied values.
 */
export function injectVariables(
  htmlBody: string,
  variables: TemplateVariables,
): string {
  const resolved: Record<string, string> = {
    client_name: variables.client_name,
    freelancer_name: variables.freelancer_name,
    amount_due: variables.amount_due,
    currency: variables.currency,
    due_date: variables.due_date,
    invoice_number: variables.invoice_number,
    days_overdue: variables.days_overdue ?? "0",
    invoice_list: variables.invoice_list ?? "",
  };

  return htmlBody.replace(
    /\{\{(\w+)\}\}/g,
    (_match, key: string): string => {
      return resolved[key] ?? "";
    },
  );
}

// ---------------------------------------------------------------------------
// 3. formatCurrency – human-readable currency string
// ---------------------------------------------------------------------------

/**
 * Format a numeric amount together with its currency code into a readable
 * string, e.g. `formatCurrency(1250, "USD")` → `"1,250.00 USD"`.
 */
export function formatCurrency(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formatted} ${currency.toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// 4. formatDate – human-readable date string
// ---------------------------------------------------------------------------

/**
 * Format a Date into a readable string such as "Jan 15, 2025".
 */
export function formatDate(date: Date): string {
  return format(date, "MMM d, yyyy");
}

// ---------------------------------------------------------------------------
// 5. calculateTriggerPoint – determine current trigger point from dates
// ---------------------------------------------------------------------------

/**
 * Given an invoice due date (and an optional reference "now" date), determine
 * which reminder trigger point the invoice is currently at.
 */
export function calculateTriggerPoint(
  dueDate: Date,
  currentDate: Date = new Date(),
): TriggerPoint {
  const now = startOfDay(currentDate);
  const due = startOfDay(dueDate);
  const daysUntilDue = differenceInDays(due, now);

  if (daysUntilDue >= 7) return "pre_due_7";
  if (daysUntilDue >= 3) return "pre_due_3";
  if (daysUntilDue >= 1) return "due_today";
  // From here we are at or past the due date.
  const daysOverdue = Math.abs(daysUntilDue);

  if (daysOverdue <= 3) return "overdue_3";
  if (daysOverdue <= 7) return "overdue_7";
  if (daysOverdue <= 14) return "overdue_14";
  if (daysOverdue <= 21) return "overdue_21";
  if (daysOverdue <= 30) return "overdue_30";
  return "final_notice";
}

// ---------------------------------------------------------------------------
// 6. calculateNextReminderDate – when should the next reminder fire?
// ---------------------------------------------------------------------------

/**
 * Given a due date and the *current* trigger point, compute the date at which
 * the next reminder should be sent.
 */
export function calculateNextReminderDate(
  dueDate: Date,
  currentTriggerPoint: string,
): Date {
  switch (currentTriggerPoint) {
    case "pre_due_7":
      return subDays(dueDate, 4); // next: pre_due_3
    case "pre_due_3":
      return dueDate;              // next: due_today
    case "due_today":
      return addDays(dueDate, 3);  // next: overdue_3
    case "overdue_3":
      return addDays(dueDate, 7);  // next: overdue_7
    case "overdue_7":
      return addDays(dueDate, 14); // next: overdue_14
    case "overdue_14":
      return addDays(dueDate, 21); // next: overdue_21
    case "overdue_21":
      return addDays(dueDate, 30); // next: overdue_30
    case "overdue_30":
      return addDays(dueDate, 37); // next: final_notice
    case "final_notice":
      return addDays(dueDate, 45); // next: write_off_notice
    default:
      return addDays(dueDate, 1);
  }
}

// ---------------------------------------------------------------------------
// 7. renderInvoiceListHtml – build an HTML table of invoices
// ---------------------------------------------------------------------------

/** Minimal shape for an invoice that we need to render in the list. */
export interface InvoiceListItem {
  invoiceNumber: string;
  amountDue: number;
  currency: string;
  dueDate: Date;
  currentStatus: string;
}

/**
 * Render a list of invoices as an HTML table suitable for email templates.
 *
 * Output:
 * ```html
 * <table>
 *   <tr><th>Invoice</th><th>Amount</th><th>Due Date</th><th>Status</th></tr>
 *   <tr><td>INV-001</td><td>$1,200.00</td><td>Mar 15, 2024</td><td>Overdue</td></tr>
 * </table>
 * ```
 */
export function renderInvoiceListHtml(invoices: InvoiceListItem[]): string {
  if (invoices.length === 0) return "<p>No invoices</p>";

  const statusLabel = (s: string): string => {
    const map: Record<string, string> = {
      upcoming: "Upcoming",
      pending: "Due Today",
      overdue_1: "Overdue",
      overdue_2: "Severely Overdue",
      pending_confirmation: "Pending Confirmation",
      paid: "Paid",
      uncollectible: "Written Off",
    };
    return map[s] || s;
  };

  const rows = invoices
    .map(
      (inv) =>
        `<tr><td>${inv.invoiceNumber}</td><td>${formatCurrency(inv.amountDue, inv.currency)}</td><td>${formatDate(inv.dueDate)}</td><td>${statusLabel(inv.currentStatus)}</td></tr>`,
    )
    .join("\n  ");

  return (
    `<table>\n` +
    `  <tr><th>Invoice</th><th>Amount</th><th>Due Date</th><th>Status</th></tr>\n` +
    `  ${rows}\n` +
    `</table>`
  );
}

// ---------------------------------------------------------------------------
// 8. computeInvoiceStatus – compute status from dueDate relative to today
// ---------------------------------------------------------------------------

/**
 * Compute the appropriate currentStatus for an invoice based on its dueDate
 * relative to the current date.
 *
 * - dueDate > TODAY+3 → upcoming
 * - dueDate <= TODAY AND dueDate > TODAY-7 → pending
 * - TODAY - dueDate >= 7 AND < 14 → overdue_1
 * - TODAY - dueDate >= 14 → overdue_2
 */
export function computeInvoiceStatus(dueDate: Date, currentDate: Date = new Date()): string {
  const now = startOfDay(currentDate);
  const due = startOfDay(dueDate);
  const daysOverdue = differenceInDays(now, due); // positive means overdue

  if (daysOverdue < -3) return "upcoming"; // dueDate > TODAY+3
  if (daysOverdue >= -3 && daysOverdue <= 0) return "pending"; // dueDate within 3 days
  if (daysOverdue >= 1 && daysOverdue < 7) return "pending";
  if (daysOverdue >= 7 && daysOverdue < 14) return "overdue_1";
  return "overdue_2"; // 14+ days overdue
}

// ---------------------------------------------------------------------------
// 9. computeNextReminderByStatus – compute next reminder date based on status
// ---------------------------------------------------------------------------

/**
 * Compute nextReminderDate based on the invoice's current status.
 *
 * - upcoming → dueDate - 3 days
 * - pending → NOW() + 3 days
 * - overdue_1 → NOW() + 7 days
 * - overdue_2 → NOW() + 14 days
 */
export function computeNextReminderByStatus(status: string, dueDate: Date, now: Date = new Date()): Date {
  switch (status) {
    case "upcoming":
      return subDays(dueDate, 3);
    case "pending":
      return addDays(now, 3);
    case "overdue_1":
      return addDays(now, 7);
    case "overdue_2":
      return addDays(now, 14);
    default:
      return addDays(now, 7);
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Zero-out the time portion of a Date so only the calendar day is compared.
 */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
