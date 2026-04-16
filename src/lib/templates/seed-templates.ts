/**
 * System Email Templates for Payo v3
 * 20 pre-built templates covering all trigger points from the Master Spec v3.0
 * across three tone levels: friendly, neutral, and firm.
 *
 * IMPORTANT: Templates do NOT contain payment links, Payoneer references,
 * or specific payment instructions. Closing line is always:
 * "Please proceed with payment as previously agreed."
 */

export interface SystemTemplate {
  userId: string | null;
  type: string;
  name: string;
  subjectLine: string;
  htmlBody: string;
  triggerPoint: string;
  tone: string;
}

// Shared email wrapper for consistent branding
function emailWrap(headerColor: string, headerTitle: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <tr>
            <td style="background-color: ${headerColor}; padding: 28px 32px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">${headerTitle}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #f8f9fa; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">Sent via Payo — Smart Invoice Reminder System</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Amount box helper
function amountBox(amount: string, dueDate: string, daysOverdue?: string): string {
  const overdueLine = daysOverdue ? `<p style="margin: 8px 0 0; font-size: 13px; color: #64748b;">Days overdue: <strong>${daysOverdue}</strong></p>` : '';
  return `<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
    <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Amount Due</p>
    <p style="margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #0f172a;">{{amount_due}} {{currency}}</p>
    <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Invoice: <strong>{{invoice_number}}</strong></p>
    <p style="margin: 0 0 0; font-size: 13px; color: #64748b;">Due Date: <strong>{{due_date}}</strong></p>
    ${overdueLine}
  </div>`;
}

// Consolidated invoice list box
function invoiceListBox(): string {
  return `<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
    <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">Outstanding Invoices</p>
    <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.8;">{{invoice_list}}</p>
  </div>`;
}

const CLOSING = `<p style="margin: 20px 0 8px; font-size: 16px; color: #334155; line-height: 1.6;">Please proceed with payment as previously agreed.</p>`;

const FRIENDLY_SIGN = `<p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">Best regards,<br/><strong>{{freelancer_name}}</strong></p>`;
const NEUTRAL_SIGN = `<p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">Regards,<br/><strong>{{freelancer_name}}</strong></p>`;
const FIRM_SIGN = `<p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">Sincerely,<br/><strong>{{freelancer_name}}</strong></p>`;

export const systemTemplates: SystemTemplate[] = [
  // =========================================================================
  // 1. pre_due_7 — friendly
  // =========================================================================
  {
    userId: null,
    type: "system",
    name: "Pre-Due 7 Days — Friendly",
    subjectLine: "Friendly Reminder: Invoice {{invoice_number}} is due on {{due_date}}",
    htmlBody: emailWrap("#10b981", "Invoice Reminder", `
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Hi {{client_name}},</p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">I hope this message finds you well! Just a quick heads-up that <strong>Invoice {{invoice_number}}</strong> will be due on <strong>{{due_date}}</strong>.</p>
      ${amountBox("{{amount_due}}", "{{due_date}}")}
      <p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">No rush at all — just wanted to keep this on your radar. Feel free to reach out if you have any questions.</p>
      ${CLOSING}
      <p style="margin: 16px 0 0; font-size: 16px; color: #334155; line-height: 1.6;">Thank you for your continued partnership!</p>
      ${FRIENDLY_SIGN}
    `),
    triggerPoint: "pre_due_7",
    tone: "friendly",
  },

  // =========================================================================
  // 2. pre_due_3 — friendly
  // =========================================================================
  {
    userId: null,
    type: "system",
    name: "Pre-Due 3 Days — Friendly",
    subjectLine: "Heads up: Invoice {{invoice_number}} is due in 3 days",
    htmlBody: emailWrap("#10b981", "Invoice Due Soon", `
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Hi {{client_name}},</p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Just a quick note — <strong>Invoice {{invoice_number}}</strong> for <strong>{{amount_due}} {{currency}}</strong> is due in 3 days on <strong>{{due_date}}</strong>.</p>
      ${amountBox("{{amount_due}}", "{{due_date}}")}
      <p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">I know things can get busy, so I wanted to send a friendly reminder. If you have any questions about this invoice, please don't hesitate to ask!</p>
      ${CLOSING}
      ${FRIENDLY_SIGN}
    `),
    triggerPoint: "pre_due_3",
    tone: "friendly",
  },

  // =========================================================================
  // 3. due_today — neutral
  // =========================================================================
  {
    userId: null,
    type: "system",
    name: "Due Today — Neutral",
    subjectLine: "Invoice {{invoice_number}} is due today",
    htmlBody: emailWrap("#f59e0b", "Invoice Due Today", `
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Dear {{client_name}},</p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">This is a reminder that <strong>Invoice {{invoice_number}}</strong> in the amount of <strong>{{amount_due}} {{currency}}</strong> is due today, <strong>{{due_date}}</strong>.</p>
      ${amountBox("{{amount_due}}", "{{due_date}}")}
      <p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">Please ensure payment is processed at your earliest convenience today. If the payment has already been sent, kindly disregard this notice.</p>
      ${CLOSING}
      ${NEUTRAL_SIGN}
    `),
    triggerPoint: "due_today",
    tone: "neutral",
  },

  // =========================================================================
  // 4. overdue_3 — friendly
  // =========================================================================
  {
    userId: null,
    type: "system",
    name: "Overdue 3 Days — Friendly",
    subjectLine: "Just checking in: Invoice {{invoice_number}} is a few days overdue",
    htmlBody: emailWrap("#10b981", "Gentle Follow-Up", `
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Hi {{client_name}},</p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">It looks like <strong>Invoice {{invoice_number}}</strong> may have slipped through — it was due on <strong>{{due_date}}</strong> and is currently <strong>{{days_overdue}} days</strong> overdue.</p>
      ${amountBox("{{amount_due}}", "{{due_date}}", "{{days_overdue}}")}
      <p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">I totally understand how busy things can get! If you've already sent the payment, please disregard this. Otherwise, could you let me know when to expect it?</p>
      ${CLOSING}
      <p style="margin: 16px 0 0; font-size: 16px; color: #334155; line-height: 1.6;">Thanks so much for your help!</p>
      ${FRIENDLY_SIGN}
    `),
    triggerPoint: "overdue_3",
    tone: "friendly",
  },

  // =========================================================================
  // 5. overdue_3 — neutral
  // =========================================================================
  {
    userId: null,
    type: "system",
    name: "Overdue 3 Days — Neutral",
    subjectLine: "Notice: Invoice {{invoice_number}} is 3 days overdue",
    htmlBody: emailWrap("#475569", "Invoice Overdue Notice", `
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Dear {{client_name}},</p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">This is to notify you that <strong>Invoice {{invoice_number}}</strong> in the amount of <strong>{{amount_due}} {{currency}}</strong> was due on <strong>{{due_date}}</strong> and is now <strong>{{days_overdue}} days</strong> overdue.</p>
      ${amountBox("{{amount_due}}", "{{due_date}}", "{{days_overdue}}")}
      <p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">Please arrange for the outstanding balance to be settled at your earliest convenience. If payment has already been made, kindly provide a transaction reference.</p>
      ${CLOSING}
      ${NEUTRAL_SIGN}
    `),
    triggerPoint: "overdue_3",
    tone: "neutral",
  },

  // =========================================================================
  // 6. overdue_3 — firm
  // =========================================================================
  {
    userId: null,
    type: "system",
    name: "Overdue 3 Days — Firm",
    subjectLine: "ACTION REQUIRED: Invoice {{invoice_number}} is overdue",
    htmlBody: emailWrap("#ef4444", "Overdue Invoice — Action Required", `
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">{{client_name}},</p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;"><strong>Invoice {{invoice_number}}</strong> for <strong>{{amount_due}} {{currency}}</strong> was due on <strong>{{due_date}}</strong> and remains unpaid. It is now <strong>{{days_overdue}} days</strong> overdue.</p>
      ${amountBox("{{amount_due}}", "{{due_date}}", "{{days_overdue}}")}
      <p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">This is your first formal notice regarding this outstanding balance. Immediate payment is expected. Please confirm receipt of this notice and provide a payment date.</p>
      ${CLOSING}
      ${FIRM_SIGN}
    `),
    triggerPoint: "overdue_3",
    tone: "firm",
  },

  // =========================================================================
  // 7. overdue_7 — friendly
  // =========================================================================
  {
    userId: null,
    type: "system",
    name: "Overdue 7 Days — Friendly",
    subjectLine: "Checking in: Invoice {{invoice_number}} is now a week overdue",
    htmlBody: emailWrap("#10b981", "Checking In", `
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Hi {{client_name}},</p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">I hope everything is going well. I'm reaching out because <strong>Invoice {{invoice_number}}</strong> for <strong>{{amount_due}} {{currency}}</strong> is now a week past its due date of <strong>{{due_date}}</strong>.</p>
      ${amountBox("{{amount_due}}", "{{due_date}}", "{{days_overdue}}")}
      <p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">I understand that delays happen. If there's a specific reason for the delay or if you need to discuss arrangements, I'm completely open to that. Could you please process the payment soon, or let me know when to expect it?</p>
      ${CLOSING}
      <p style="margin: 16px 0 0; font-size: 16px; color: #334155; line-height: 1.6;">Thanks for understanding!</p>
      ${FRIENDLY_SIGN}
    `),
    triggerPoint: "overdue_7",
    tone: "friendly",
  },

  // =========================================================================
  // 8. overdue_7 — neutral
  // =========================================================================
  {
    userId: null,
    type: "system",
    name: "Overdue 7 Days — Neutral",
    subjectLine: "Second notice: Invoice {{invoice_number}} is 7 days past due",
    htmlBody: emailWrap("#475569", "Second Notice — Invoice Overdue", `
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Dear {{client_name}},</p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">This is my second notice regarding <strong>Invoice {{invoice_number}}</strong> for <strong>{{amount_due}} {{currency}}</strong>. This invoice was due on <strong>{{due_date}}</strong> and is now <strong>{{days_overdue}} days</strong> overdue.</p>
      ${amountBox("{{amount_due}}", "{{due_date}}", "{{days_overdue}}")}
      <p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">As per our agreement, payment was expected by the due date. Previous reminders do not appear to have been addressed. Please arrange for immediate settlement of this balance.</p>
      ${CLOSING}
      ${NEUTRAL_SIGN}
    `),
    triggerPoint: "overdue_7",
    tone: "neutral",
  },

  // =========================================================================
  // 9. overdue_7 — firm
  // =========================================================================
  {
    userId: null,
    type: "system",
    name: "Overdue 7 Days — Firm",
    subjectLine: "URGENT: Invoice {{invoice_number}} — Immediate payment required",
    htmlBody: emailWrap("#ef4444", "URGENT — Invoice Overdue One Week", `
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">{{client_name}},</p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Despite previous reminders, <strong>Invoice {{invoice_number}}</strong> for <strong>{{amount_due}} {{currency}}</strong> remains unpaid. The due date was <strong>{{due_date}}</strong>. This invoice is now <strong>{{days_overdue}} days</strong> overdue.</p>
      ${amountBox("{{amount_due}}", "{{due_date}}", "{{days_overdue}}")}
      <p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">This continued non-payment is being formally documented. I require immediate payment or a written commitment with a specific payment date. Failure to respond may result in further escalation.</p>
      ${CLOSING}
      ${FIRM_SIGN}
    `),
    triggerPoint: "overdue_7",
    tone: "firm",
  },

  // =========================================================================
  // 10. overdue_14 — friendly
  // =========================================================================
  {
    userId: null,
    type: "system",
    name: "Overdue 14 Days — Friendly",
    subjectLine: "Following up: Invoice {{invoice_number}} is now 2 weeks overdue",
    htmlBody: emailWrap("#10b981", "Still Following Up", `
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Hi {{client_name}},</p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">I've sent a few reminders about <strong>Invoice {{invoice_number}}</strong> for <strong>{{amount_due}} {{currency}}</strong>, which was due on <strong>{{due_date}}</strong>. It's now been two weeks since the due date.</p>
      ${amountBox("{{amount_due}}", "{{due_date}}", "{{days_overdue}}")}
      <p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">I value our working relationship and I'm sure there's just been an oversight. I do need to keep my finances on track, so I'd really appreciate it if you could process this payment promptly. If anything is preventing payment, please let me know so we can figure it out together.</p>
      ${CLOSING}
      <p style="margin: 16px 0 0; font-size: 16px; color: #334155; line-height: 1.6;">Thank you for your understanding and cooperation.</p>
      ${FRIENDLY_SIGN}
    `),
    triggerPoint: "overdue_14",
    tone: "friendly",
  },

  // =========================================================================
  // 11. overdue_14 — neutral
  // =========================================================================
  {
    userId: null,
    type: "system",
    name: "Overdue 14 Days — Neutral",
    subjectLine: "Formal notice: Invoice {{invoice_number}} is 14 days overdue",
    htmlBody: emailWrap("#475569", "Formal Notice — Invoice Overdue", `
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Dear {{client_name}},</p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Despite multiple reminders, <strong>Invoice {{invoice_number}}</strong> for <strong>{{amount_due}} {{currency}}</strong> remains unpaid. The original due date was <strong>{{due_date}}</strong>. This invoice is now <strong>{{days_overdue}} days</strong> overdue.</p>
      ${amountBox("{{amount_due}}", "{{due_date}}", "{{days_overdue}}")}
      <p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">This continued non-payment is being formally documented. I require immediate payment or a clear written commitment with a specific payment date. Please be advised that if this matter is not resolved promptly, I may need to reconsider the terms of our engagement.</p>
      ${CLOSING}
      ${NEUTRAL_SIGN}
    `),
    triggerPoint: "overdue_14",
    tone: "neutral",
  },

  // =========================================================================
  // 12. overdue_14 — firm
  // =========================================================================
  {
    userId: null,
    type: "system",
    name: "Overdue 14 Days — Firm",
    subjectLine: "FINAL WARNING: Invoice {{invoice_number}} — Escalation imminent",
    htmlBody: emailWrap("#ef4444", "FINAL WARNING — Invoice Overdue", `
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">{{client_name}},</p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">This is a <strong>final warning</strong> regarding <strong>Invoice {{invoice_number}}</strong> for <strong>{{amount_due}} {{currency}}</strong>. Despite multiple communications, this invoice — due on <strong>{{due_date}}</strong> — remains unpaid <strong>{{days_overdue}} days</strong> after the due date.</p>
      ${amountBox("{{amount_due}}", "{{due_date}}", "{{days_overdue}}")}
      <p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">If payment or a formal commitment is not received within <strong>48 hours</strong>, I will proceed with formal escalation measures. This may include suspending all current work, engaging a collections service, or pursuing legal remedies. This is my final attempt to resolve this amicably.</p>
      ${CLOSING}
      ${FIRM_SIGN}
    `),
    triggerPoint: "overdue_14",
    tone: "firm",
  },

  // =========================================================================
  // 13. overdue_21 — neutral
  // =========================================================================
  {
    userId: null,
    type: "system",
    name: "Overdue 21 Days — Neutral",
    subjectLine: "Serious notice: Invoice {{invoice_number}} is 21 days overdue",
    htmlBody: emailWrap("#475569", "Serious Notice — Invoice Overdue", `
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Dear {{client_name}},</p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">I must inform you that <strong>Invoice {{invoice_number}}</strong> for <strong>{{amount_due}} {{currency}}</strong> has now been overdue for <strong>{{days_overdue}} days</strong> (due date: <strong>{{due_date}}</strong>). Despite numerous reminders, this matter remains unresolved.</p>
      ${amountBox("{{amount_due}}", "{{due_date}}", "{{days_overdue}}")}
      <p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">At this stage, I must formally request immediate resolution. This account is being flagged for escalation. Please settle this balance without further delay or provide a definitive payment timeline in writing.</p>
      ${CLOSING}
      ${NEUTRAL_SIGN}
    `),
    triggerPoint: "overdue_21",
    tone: "neutral",
  },

  // =========================================================================
  // 14. overdue_21 — firm
  // =========================================================================
  {
    userId: null,
    type: "system",
    name: "Overdue 21 Days — Firm",
    subjectLine: "DEMAND FOR PAYMENT: Invoice {{invoice_number}} — {{days_overdue}} days overdue",
    htmlBody: emailWrap("#dc2626", "DEMAND FOR PAYMENT", `
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">{{client_name}},</p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">This is a <strong>formal demand for payment</strong>. <strong>Invoice {{invoice_number}}</strong> in the amount of <strong>{{amount_due}} {{currency}}</strong> has been overdue for <strong>{{days_overdue}} days</strong> (original due date: <strong>{{due_date}}</strong>).</p>
      ${amountBox("{{amount_due}}", "{{due_date}}", "{{days_overdue}}")}
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">All work on current projects is suspended effective immediately. All future engagements are on hold until this balance is settled in full.</p>
      <p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">You have <strong>72 hours</strong> from receipt of this notice to remit full payment. After this period, I will proceed with formal debt recovery proceedings without further notice.</p>
      ${CLOSING}
      ${FIRM_SIGN}
    `),
    triggerPoint: "overdue_21",
    tone: "firm",
  },

  // =========================================================================
  // 15. overdue_30 — firm
  // =========================================================================
  {
    userId: null,
    type: "system",
    name: "Overdue 30 Days — Firm",
    subjectLine: "FINAL DEMAND: Invoice {{invoice_number}} — 30 days overdue — Collections imminent",
    htmlBody: emailWrap("#991b1b", "FINAL DEMAND FOR PAYMENT", `
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">{{client_name}},</p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">This constitutes my <strong>final demand for payment</strong> before formal escalation. <strong>Invoice {{invoice_number}}</strong> for <strong>{{amount_due}} {{currency}}</strong> has been overdue for <strong>{{days_overdue}} days</strong> (due: <strong>{{due_date}}</strong>).</p>
      ${amountBox("{{amount_due}}", "{{due_date}}", "{{days_overdue}}")}
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">All services have been suspended. This matter has been escalated to formal debt recovery. Unless full payment is received within <strong>7 days</strong>, this account will be forwarded to an external collections agency, and all associated fees will be added to the balance owed.</p>
      <p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">This is my absolute final communication on this matter before legal proceedings commence.</p>
      ${CLOSING}
      ${FIRM_SIGN}
    `),
    triggerPoint: "overdue_30",
    tone: "firm",
  },

  // =========================================================================
  // 16. final_notice — firm
  // =========================================================================
  {
    userId: null,
    type: "system",
    name: "Final Notice — Firm",
    subjectLine: "NOTICE OF DEFAULT: Invoice {{invoice_number}} — Account referred to collections",
    htmlBody: emailWrap("#7f1d1d", "NOTICE OF DEFAULT", `
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">{{client_name}},</p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">This is a <strong>Notice of Default</strong>. <strong>Invoice {{invoice_number}}</strong> for <strong>{{amount_due}} {{currency}}</strong> has been outstanding for <strong>{{days_overdue}} days</strong> past its due date of <strong>{{due_date}}</strong>.</p>
      ${amountBox("{{amount_due}}", "{{due_date}}", "{{days_overdue}}")}
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">As all previous attempts to resolve this matter have been unsuccessful, this invoice has been formally written off as uncollectible through standard accounting procedures. A record of this default will be maintained.</p>
      <p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">Should you wish to resolve this balance, please contact me to discuss arrangements. No further automated reminders will be sent for this invoice.</p>
      ${CLOSING}
      ${FIRM_SIGN}
    `),
    triggerPoint: "final_notice",
    tone: "firm",
  },

  // =========================================================================
  // 17. consolidated_weekly — neutral
  // =========================================================================
  {
    userId: null,
    type: "system",
    name: "Consolidated Weekly Summary — Neutral",
    subjectLine: "Weekly Account Summary — Outstanding Invoices",
    htmlBody: emailWrap("#475569", "Weekly Account Summary", `
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Dear {{client_name}},</p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Below is a summary of all outstanding invoices on your account as of this week. Please review and arrange payment for any unpaid balances.</p>
      ${invoiceListBox()}
      <p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">If any of these invoices have already been paid, please disregard this notice. For questions about specific invoices, feel free to reach out.</p>
      ${CLOSING}
      ${NEUTRAL_SIGN}
    `),
    triggerPoint: "consolidated_weekly",
    tone: "neutral",
  },

  // =========================================================================
  // 18. pending_confirmation — friendly
  // =========================================================================
  {
    userId: null,
    type: "system",
    name: "Pending Confirmation — Friendly",
    subjectLine: "Thank you! Confirming receipt of payment for Invoice {{invoice_number}}",
    htmlBody: emailWrap("#10b981", "Payment Confirmation Request", `
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Hi {{client_name}},</p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Thank you for letting me know about the payment for <strong>Invoice {{invoice_number}}</strong> for <strong>{{amount_due}} {{currency}}</strong>! I really appreciate it.</p>
      ${amountBox("{{amount_due}}", "{{due_date}}")}
      <p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">I'm currently verifying the payment on my end. Once confirmed, the invoice will be marked as paid and this matter will be fully closed. I'll follow up with you shortly.</p>
      ${CLOSING}
      <p style="margin: 16px 0 0; font-size: 16px; color: #334155; line-height: 1.6;">Thank you again for your prompt attention!</p>
      ${FRIENDLY_SIGN}
    `),
    triggerPoint: "pending_confirmation",
    tone: "friendly",
  },

  // =========================================================================
  // 19. payment_confirmed — friendly
  // =========================================================================
  {
    userId: null,
    type: "system",
    name: "Payment Confirmed — Friendly",
    subjectLine: "Payment confirmed! Invoice {{invoice_number}} is now settled",
    htmlBody: emailWrap("#10b981", "Payment Confirmed", `
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Hi {{client_name}},</p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Great news! I've confirmed receipt of your payment for <strong>Invoice {{invoice_number}}</strong> in the amount of <strong>{{amount_due}} {{currency}}</strong>. This invoice is now marked as <strong>paid</strong>.</p>
      ${amountBox("{{amount_due}}", "{{due_date}}")}
      <p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">Thank you for your timely payment! I truly value our working relationship and look forward to continuing our collaboration. If you need anything else, don't hesitate to reach out.</p>
      ${FRIENDLY_SIGN}
    `),
    triggerPoint: "payment_confirmed",
    tone: "friendly",
  },

  // =========================================================================
  // 20. write_off_notice — neutral
  // =========================================================================
  {
    userId: null,
    type: "system",
    name: "Write-Off Notice — Neutral",
    subjectLine: "Notice: Invoice {{invoice_number}} has been written off",
    htmlBody: emailWrap("#475569", "Invoice Write-Off Notice", `
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">Dear {{client_name}},</p>
      <p style="margin: 0 0 16px; font-size: 16px; color: #334155; line-height: 1.6;">This notice is to inform you that <strong>Invoice {{invoice_number}}</strong> for <strong>{{amount_due}} {{currency}}</strong> (originally due on <strong>{{due_date}}</strong>) has been <strong>written off</strong> from active accounts after being outstanding for an extended period.</p>
      ${amountBox("{{amount_due}}", "{{due_date}}")}
      <p style="margin: 0 0 0; font-size: 16px; color: #334155; line-height: 1.6;">This does not relieve you of the obligation to pay. If you wish to settle this balance, please contact me to discuss options. No further automated reminders will be sent regarding this invoice.</p>
      ${CLOSING}
      ${NEUTRAL_SIGN}
    `),
    triggerPoint: "write_off_notice",
    tone: "neutral",
  },
];
