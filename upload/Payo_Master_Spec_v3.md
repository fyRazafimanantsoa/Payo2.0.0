**PAYO**

Invoice Tracking & Reminder Platform

*Master Product Specification --- v3.0*

**Production-Ready. All gaps resolved. Ship this.**

+-----------------------------------------------------------------------+
| **12 Sections • Complete Schema • All Edge Cases Defined**            |
|                                                                       |
| Trial Logic • Grace Periods • Audit Logs • Soft Deletes • Churn       |
| Handling                                                              |
+-----------------------------------------------------------------------+

**0. Core Concept & System Boundaries**

Payo is a two-sided SaaS application. The boundary between what this
platform does and what it never does is the most important design
constraint. Every feature decision must pass through this filter first.

  ----------------------------------- -----------------------------------
  **FRONTOFFICE --- User Side**       **BACKOFFICE --- Admin Side**

  Freelancers & small businesses      Platform owner only

  Track invoices sent to clients      Track user subscriptions

  Send reminder emails to clients     Send payment reminders to users

  No payment handling whatsoever      Receives payments via Payoneer

  Clients never log into the app      Manages user accounts & plans

  Users pay Payo to use the tool      You collect those subscription fees
  ----------------------------------- -----------------------------------

  -----------------------------------------------------------------------
  **🚨 What Payo NEVER Does --- These Are Absolute Limits**

  NEVER process payments between users and their clients

  NEVER include Payoneer, Stripe, or any payment detail in frontoffice
  emails

  NEVER give clients an account, login, or any access to the platform

  NEVER auto-delete data --- users and admins make that call manually

  NEVER auto-suspend users --- admin must confirm every suspension
  -----------------------------------------------------------------------

**1. Database Schema --- Complete**

Use PostgreSQL. All fields required unless marked nullable. Soft deletes
on all primary entities --- no cascade hard deletes.

**Table: users**

  --------------------------- -------------- ------------------------------------
  **Field**                   **Type**       **Notes**

  **id**                      UUID PK        Auto-generated

  **email**                   VARCHAR 255    Unique, required, stored lowercase

  **hashed_password**         VARCHAR        bcrypt hash, never stored plain

  **business_name**           VARCHAR 255    Used in email signatures

  **default_reminder_tone**   ENUM           friendly \| neutral \| firm

  **plan_type**               ENUM           trial \| starter \| pro

  **subscription_status**     ENUM           trial \| active \| overdue \|
                                             suspended \| cancelled

  **trial_ends_at**           TIMESTAMP      Nullable --- set on signup, e.g.
                                             NOW() + 14 days

  **is_admin**                BOOLEAN        Default false

  **email_verified**          BOOLEAN        Default false

  **email_verified_at**       TIMESTAMP      Nullable

  **locale**                  VARCHAR 10     e.g. en-US, fr-FR --- for number
                                             formatting

  **deleted_at**              TIMESTAMP      Nullable --- soft delete

  **created_at**              TIMESTAMP      Auto-set

  **updated_at**              TIMESTAMP      Auto-updated
  --------------------------- -------------- ------------------------------------

**Table: clients**

  -------------------------- -------------- ------------------------------------
  **Field**                  **Type**       **Notes**

  **id**                     UUID PK        Auto-generated

  **user_id**                UUID FK        References users.id

  **name**                   VARCHAR 255    Client name shown in reminders

  **primary_email**          VARCHAR 255    Main recipient of reminder emails

  **cc_emails**              TEXT\[\]       Nullable --- CC list for this client

  **assigned_template_id**   UUID FK        Nullable --- overrides user default

  **preferred_currency**     VARCHAR 3      ISO 4217 e.g. USD, EUR, MGA

  **locale**                 VARCHAR 10     For amount formatting, falls back to
                                            user locale

  **email_status**           ENUM           active \| bounced \| complained ---
                                            updated by webhooks

  **notes**                  TEXT           Internal only, never included in
                                            emails

  **deleted_at**             TIMESTAMP      Nullable --- soft delete

  **created_at**             TIMESTAMP      Auto-set
  -------------------------- -------------- ------------------------------------

**Table: invoices**

  --------------------------- -------------- ------------------------------------
  **Field**                   **Type**       **Notes**

  **id**                      UUID PK        Auto-generated

  **user_id**                 UUID FK        References users.id

  **client_id**               UUID FK        References clients.id

  **invoice_number**          VARCHAR 100    User-defined, e.g. INV-2024-001

  **amount_due**              DECIMAL 10,2   Remaining amount owed

  **currency**                VARCHAR 3      ISO 4217 code

  **issue_date**              DATE           Invoice issue date

  **due_date**                DATE           Payment deadline

  **current_status**          ENUM           upcoming \| pending \| overdue_1 \|
                                             overdue_2 \| pending_confirmation \|
                                             paid \| uncollectible

  **last_reminder_sent_at**   TIMESTAMP      Nullable

  **last_reminder_status**    ENUM           Nullable --- sent \| failed \|
                                             bounced

  **next_reminder_date**      TIMESTAMP      Computed by cron, nullable

  **reminder_count**          INTEGER        Default 0 --- tracks escalation
                                             depth

  **consecutive_failures**    INTEGER        Default 0 --- resets on success

  **notes**                   TEXT           Internal only, never emailed

  **deleted_at**              TIMESTAMP      Nullable --- soft delete

  **created_at**              TIMESTAMP      Auto-set

  **updated_at**              TIMESTAMP      Auto-updated
  --------------------------- -------------- ------------------------------------

**Table: reminder_logs**

  ------------------------- -------------- ------------------------------------
  **Field**                 **Type**       **Notes**

  **id**                    UUID PK        Auto-generated

  **invoice_id**            UUID FK        References invoices.id

  **user_id**               UUID FK        References users.id

  **template_id**           UUID FK        Template used for this send

  **sent_at**               TIMESTAMP      Exact send time

  **recipient_email**       VARCHAR 255    Primary recipient at time of send

  **cc_emails**             TEXT\[\]       CC list at time of send (snapshot)

  **email_subject**         VARCHAR 500    Rendered subject (after variable
                                           substitution)

  **email_body_html**       TEXT           Full rendered HTML stored for audit

  **status**                ENUM           sent \| failed \| bounced \| blocked

  **provider_message_id**   VARCHAR        From email provider --- for delivery
                                           tracking

  **failure_reason**        TEXT           Nullable --- populated on
                                           failure/bounce
  ------------------------- -------------- ------------------------------------

**Table: templates**

  ------------------- -------------- ------------------------------------
  **Field**           **Type**       **Notes**

  **id**              UUID PK        Auto-generated

  **user_id**         UUID FK        Nullable --- null = system template

  **type**            ENUM           system \| user_custom

  **name**            VARCHAR 255    Display name

  **tone**            ENUM           friendly \| neutral \| firm \| null

  **trigger_point**   ENUM           See Section 3.3 for full list

  **subject_line**    VARCHAR 500    Supports {{variables}}

  **html_body**       TEXT           Supports {{variables}}

  **is_active**       BOOLEAN        Default true

  **deleted_at**      TIMESTAMP      Nullable --- soft delete
                                     (user_custom only)

  **created_at**      TIMESTAMP      Auto-set
  ------------------- -------------- ------------------------------------

**Table: subscriptions**

  --------------------------- -------------- ------------------------------------
  **Field**                   **Type**       **Notes**

  **id**                      UUID PK        Auto-generated

  **user_id**                 UUID FK        References users.id

  **plan_type**               ENUM           starter \| pro

  **amount**                  DECIMAL 10,2   Billing amount for this cycle

  **currency**                VARCHAR 3      ISO 4217

  **billing_cycle**           ENUM           monthly \| annual

  **due_date**                DATE           Next payment due date

  **status**                  ENUM           pending \| overdue \| paid \|
                                             cancelled

  **overdue_since**           TIMESTAMP      Nullable --- set when status becomes
                                             overdue

  **paid_at**                 TIMESTAMP      Nullable --- set when admin marks
                                             paid

  **marked_paid_by**          UUID FK        Admin user id --- audit trail

  **last_reminder_sent_at**   TIMESTAMP      Nullable

  **next_reminder_date**      TIMESTAMP      Computed by cron

  **created_at**              TIMESTAMP      Auto-set
  --------------------------- -------------- ------------------------------------

**Table: subscription_history ★ NEW**

  --------------------- -------------- ------------------------------------
  **Field**             **Type**       **Notes**

  **id**                UUID PK        Auto-generated

  **user_id**           UUID FK        References users.id

  **subscription_id**   UUID FK        References subscriptions.id

  **plan_type**         ENUM           Plan at time of payment

  **amount**            DECIMAL 10,2   Amount actually paid

  **currency**          VARCHAR 3      ISO 4217

  **billing_cycle**     ENUM           monthly \| annual

  **paid_at**           TIMESTAMP      When payment was confirmed by admin

  **marked_paid_by**    UUID FK        Admin user id

  **period_start**      DATE           Start of the period this payment
                                       covers

  **period_end**        DATE           End of the period this payment
                                       covers

  **notes**             TEXT           Nullable --- admin notes on this
                                       payment
  --------------------- -------------- ------------------------------------

**Table: admin_logs ★ NEW**

  ---------------------------- -------------- ------------------------------------
  **Field**                    **Type**       **Notes**

  **id**                       UUID PK        Auto-generated

  **admin_id**                 UUID FK        References users.id (must have
                                              is_admin=true)

  **action**                   ENUM           suspend_user \| reactivate_user \|
                                              mark_paid \| send_reminder \|
                                              cancel_plan \| downgrade_plan \|
                                              change_plan

  **target_user_id**           UUID FK        The user this action was performed
                                              on

  **target_subscription_id**   UUID FK        Nullable --- if action relates to
                                              subscription

  **previous_value**           JSONB          Nullable --- state before the action

  **new_value**                JSONB          Nullable --- state after the action

  **notes**                    TEXT           Nullable --- admin note at time of
                                              action

  **performed_at**             TIMESTAMP      Auto-set to NOW()

  **ip_address**               VARCHAR 45     Admin IP at time of action
  ---------------------------- -------------- ------------------------------------

**Table: sessions**

  ------------------- -------------- ------------------------------------
  **Field**           **Type**       **Notes**

  **id**              UUID PK        Auto-generated

  **user_id**         UUID FK        References users.id

  **token_hash**      VARCHAR        bcrypt hash of the session token

  **expires_at**      TIMESTAMP      24h standard, 7d remember-me

  **ip_address**      VARCHAR 45     At session creation

  **user_agent**      TEXT           Browser/client info

  **created_at**      TIMESTAMP      Auto-set
  ------------------- -------------- ------------------------------------

**2. Trial & Subscription Lifecycle ★**

Every new user enters a trial state. No credit card required. No money
owed at signup. This is the entry gate into the monetization loop.

**2.1 Trial State Logic**

+-----------------------------------------------------------------------+
| ON USER SIGNUP:                                                       |
|                                                                       |
| users.plan_type = \"trial\"                                           |
|                                                                       |
| users.subscription_status = \"trial\"                                 |
|                                                                       |
| users.trial_ends_at = NOW() + TRIAL_DAYS (default: 14)                |
|                                                                       |
| TRIAL PERIOD:                                                         |
|                                                                       |
| Full access to all features                                           |
|                                                                       |
| No banners, no restrictions                                           |
|                                                                       |
| Email sent on day 1: \"Welcome --- your trial ends in 14 days\"       |
|                                                                       |
| Email sent on day 11: \"3 days left on your trial --- choose a plan\" |
|                                                                       |
| Email sent on day 13: \"Last day of your trial\"                      |
|                                                                       |
| ON TRIAL EXPIRY (cron check, daily):                                  |
|                                                                       |
| IF trial_ends_at \< NOW() AND subscription_status = \"trial\":        |
|                                                                       |
| SET subscription_status = \"overdue\"                                 |
|                                                                       |
| SET plan_type = \"starter\" // default plan assigned                  |
|                                                                       |
| CREATE subscription record with due_date = TODAY()                    |
|                                                                       |
| Show upgrade banner in frontoffice                                    |
|                                                                       |
| Disable reminder sending until subscription is paid                   |
+-----------------------------------------------------------------------+

**2.2 Plan Types & Limits**

  ----------------- ----------------- ----------------- -----------------
  **Feature**       **Trial**         **Starter**       **Pro**

  **Max clients**   10                25                Unlimited

  **Max invoices**  20                100               Unlimited

  **Custom          No                Yes (5 max)       Yes (unlimited)
  templates**                                           

  **Reminder        30 days           90 days           1 year
  history**                                             

  **Email           Payo shared       Payo shared       Payo shared
  provider**                                            

  **Support**       Email only        Email only        Priority

  **Duration**      14 days           Monthly/Annual    Monthly/Annual
  ----------------- ----------------- ----------------- -----------------

**2.3 Churn & Downgrade Handling ★**

-   Downgrade (pro → starter): applies at the START of the next billing
    cycle, not immediately

-   User keeps pro features until cycle ends. Downgrade is recorded in
    subscriptions with future effective_date.

-   Cancellation: subscription status → \"cancelled\". User retains
    read-only access to all data indefinitely.

-   Cancelled users cannot send reminders but can export their data.

-   Reactivation: admin creates new subscription record, sets status =
    \"pending\". User pays → active.

-   Reactivated users resume from their previous plan type unless admin
    sets a different one.

**2.4 Grace Period UX (Day-by-Day) ★**

Users should always understand what is happening to their account.
Define explicit UX states for each overdue stage:

  --------------- ------------------ ----------------------------------------
  **Day Range**   **Status**         **UX Behavior**

  **Day 0**       Trial active       No banners. Full access.

  **Day 11--13    Trial expiring     Soft yellow banner: \"Your trial ends in
  (trial)**                          X days --- choose a plan to continue.\"

  **Day 1--6      Overdue --- soft   Yellow banner: \"Your payment is due.
  (overdue)**                        Please send via Payoneer.\" Full access
                                     retained.

  **Day 7--14     Overdue ---        Orange banner: \"Your account is X days
  (overdue)**     warning            overdue. Reminder sending will be paused
                                     soon.\"

  **Day 15--29    Overdue ---        Red banner: \"Reminder sending paused.
  (overdue)**     critical           Pay now to restore access.\" Reminders
                                     disabled.

  **Day 30+       Eligible for       Admin dashboard flags account. Admin
  (overdue)**     suspend            clicks Suspend manually. User sees
                                     lockout screen.

  **Suspended**   Suspended          User can log in, view data, export data.
                                     Cannot send any reminders. Clear message
                                     shown.
  --------------- ------------------ ----------------------------------------

**3. Invoice State Machine**

Every invoice exists in exactly one state. State changes are either
automatic (cron) or triggered by explicit user action. Terminal states
cannot be reversed.

  -------------------------- ---------------- ---------------- ---------------------
  **State**                  **Trigger**      **Actor**        **Notes**

  **upcoming**               Due date \> 3    Cron             Send pre-due reminder
                             days away                         emails

  **pending**                Due date reached Cron             Send due-date
                                                               reminder

  **overdue_1**              7+ days past due Cron             Escalate tone

  **overdue_2**              14+ days past    Cron             Max escalation, stays
                             due                               here

  **pending_confirmation**   \"Client says    User             Pauses auto-reminders
                             paid\" clicked                    

  **paid**                   \"Mark as Paid\" User             Terminal --- no more
                             confirmed                         reminders

  **uncollectible**          \"Write Off\"    User             Terminal --- internal
                             confirmed                         record only
  -------------------------- ---------------- ---------------- ---------------------

**4. Template Engine**

**4.1 Resolution Hierarchy**

-   Tier 1 --- Client-specific: client.assigned_template_id is set → use
    it

-   Tier 2 --- User custom: user has a custom template for this
    trigger_point → use it

-   Tier 3 --- System default: match trigger_point +
    user.default_reminder_tone → use system template

**4.2 Allowed Variables**

  ------------------------- -------------------------------------------------
  **Variable**              **Resolves To**

  **{{client_name}}**       clients.name

  **{{freelancer_name}}**   users.business_name

  **{{invoice_number}}**    invoices.invoice_number

  **{{amount_due}}**        Locale-formatted amount (e.g. \$1,200.00 or 1
                            200,00 €)

  **{{currency}}**          invoices.currency (ISO code)

  **{{due_date}}**          Locale-formatted due date

  **{{days_overdue}}**      Computed: TODAY - due_date (overdue templates
                            only)

  **{{invoice_list}}**      HTML table of all consolidated invoices in this
                            email
  ------------------------- -------------------------------------------------

  -----------------------------------------------------------------------
  **🚨 FORBIDDEN in Frontoffice Templates --- Zero Exceptions**

  Payment links of any kind

  Payoneer email address, username, or any Payoneer reference

  Bank account details, IBAN, routing numbers

  Payment instructions (\"send via wire to\...\", \"pay via Zelle
  to\...\")

  Any URL that redirects to a payment page

  Closing line must be EXACTLY: \"Please proceed with payment as
  previously agreed.\"
  -----------------------------------------------------------------------

**4.3 System Templates (20 pre-seeded)**

  -------------------------- ------------ --------------------------------------
  **Trigger Point**          **Tone**     **When It Fires**

  **pre_due_7**              Friendly     7 days before due date

  **pre_due_3**              Friendly     3 days before due date

  **due_today**              Neutral      On the due date

  **overdue_3**              Friendly     3 days past due

  **overdue_3**              Neutral      3 days past due

  **overdue_3**              Firm         3 days past due

  **overdue_7**              Friendly     7 days past due

  **overdue_7**              Neutral      7 days past due

  **overdue_7**              Firm         7 days past due

  **overdue_14**             Friendly     14 days past due

  **overdue_14**             Neutral      14 days past due

  **overdue_14**             Firm         14 days past due

  **overdue_21**             Neutral      21 days past due

  **overdue_21**             Firm         21 days past due

  **overdue_30**             Firm         30 days past due

  **final_notice**           Firm         45 days past due

  **consolidated_weekly**    Neutral      Client has 3+ open invoices --- weekly
                                          digest

  **pending_confirmation**   Friendly     User marks \"client says they paid\"

  **payment_confirmed**      Friendly     User marks invoice as paid --- thank
                                          you email

  **write_off_notice**       Neutral      Internal record only --- not sent to
                                          client
  -------------------------- ------------ --------------------------------------

**5. Automation Engine (Cron Jobs)**

**5.1 Frontoffice Cron --- Every 30 Minutes**

+-----------------------------------------------------------------------+
| EVERY 30 MINUTES:                                                     |
|                                                                       |
| 1\. SELECT invoices WHERE:                                            |
|                                                                       |
| current_status IN (upcoming, pending, overdue_1, overdue_2)           |
|                                                                       |
| AND next_reminder_date \<= NOW()                                      |
|                                                                       |
| AND users.subscription_status NOT IN (\"suspended\",                  |
| \"trial_expired\")                                                    |
|                                                                       |
| AND clients.email_status != \"bounced\"                               |
|                                                                       |
| AND clients.email_status != \"complained\"                            |
|                                                                       |
| AND invoices.deleted_at IS NULL                                       |
|                                                                       |
| 2\. GROUP BY client_id                                                |
|                                                                       |
| 3\. FOR EACH client group:                                            |
|                                                                       |
| a\. Find HIGHEST urgency status in group:                             |
|                                                                       |
| overdue_2 \> overdue_1 \> pending \> upcoming                         |
|                                                                       |
| b\. Resolve template (3-tier: client → user → system)                 |
|                                                                       |
| using highest urgency as trigger_point                                |
|                                                                       |
| c\. Render {{invoice_list}} as HTML table of ALL invoices             |
|                                                                       |
| in this group (regardless of individual status)                       |
|                                                                       |
| d\. Substitute all template variables                                 |
|                                                                       |
| e\. Send ONE email (primary + CC)                                     |
|                                                                       |
| f\. INSERT into reminder_logs                                         |
|                                                                       |
| g\. UPDATE each invoice:                                              |
|                                                                       |
| \- last_reminder_sent_at = NOW()                                      |
|                                                                       |
| \- last_reminder_status = \"sent\" \| \"failed\"                      |
|                                                                       |
| \- consecutive_failures++ on failure (reset to 0 on success)          |
|                                                                       |
| h\. COMPUTE next_reminder_date per status:                            |
|                                                                       |
| upcoming → due_date - 3 days                                          |
|                                                                       |
| pending → NOW() + 3 days                                              |
|                                                                       |
| overdue_1 → NOW() + 7 days                                            |
|                                                                       |
| overdue_2 → NOW() + 14 days                                           |
|                                                                       |
| 4\. UPDATE invoice statuses:                                          |
|                                                                       |
| due_date \> TODAY+3 → upcoming                                        |
|                                                                       |
| due_date \<= TODAY → pending                                          |
|                                                                       |
| TODAY - due_date \>= 7 → overdue_1                                    |
|                                                                       |
| TODAY - due_date \>= 14 → overdue_2                                   |
+-----------------------------------------------------------------------+

**5.2 Backoffice Cron --- Daily at 08:00 UTC**

+-----------------------------------------------------------------------+
| EVERY DAY AT 08:00 UTC:                                               |
|                                                                       |
| 1\. CHECK trial expirations:                                          |
|                                                                       |
| SELECT users WHERE trial_ends_at \< NOW()                             |
|                                                                       |
| AND subscription_status = \"trial\"                                   |
|                                                                       |
| → SET subscription_status = \"overdue\"                               |
|                                                                       |
| → CREATE subscriptions record                                         |
|                                                                       |
| → SET overdue_since = NOW()                                           |
|                                                                       |
| 2\. SEND subscription payment reminders:                              |
|                                                                       |
| SELECT subscriptions WHERE                                            |
|                                                                       |
| status IN (pending, overdue)                                          |
|                                                                       |
| AND next_reminder_date \<= TODAY()                                    |
|                                                                       |
| FOR EACH:                                                             |
|                                                                       |
| a\. Send payment reminder email to user                               |
|                                                                       |
| b\. Include PAYONEER_EMAIL from env (admin side only)                 |
|                                                                       |
| c\. Log the send                                                      |
|                                                                       |
| d\. Compute next_reminder_date:                                       |
|                                                                       |
| pending → TODAY + 3 days                                              |
|                                                                       |
| overdue \< 14d → TODAY + 5 days                                       |
|                                                                       |
| overdue \>= 14d → TODAY + 3 days                                      |
|                                                                       |
| 3\. FLAG suspension candidates (do NOT auto-suspend):                 |
|                                                                       |
| SELECT subscriptions WHERE                                            |
|                                                                       |
| overdue_since \< NOW() - 30 days                                      |
|                                                                       |
| → ADD to admin dashboard \"Needs Review\" panel                       |
|                                                                       |
| → Admin must manually click Suspend                                   |
+-----------------------------------------------------------------------+

**6. Soft Delete Strategy ★**

Hard deletes with cascade are a user support nightmare. Soft deletes
prevent data loss while keeping the UX clean.

**6.1 Rules**

-   All primary entities (users, clients, invoices, templates) have a
    deleted_at TIMESTAMP field

-   Deleting anything sets deleted_at = NOW() --- the row stays in the
    database

-   All queries MUST include WHERE deleted_at IS NULL --- enforce this
    at the ORM/query layer

-   Deleted clients still show in reminder_logs (historical record) ---
    they just cannot receive new reminders

-   Deleted invoices still appear in reminder_logs history

-   Users (admins) can permanently purge data via a separate \"purge\"
    action requiring confirmation

**6.2 Cascade Soft Delete Chain**

+-----------------------------------------------------------------------+
| User deletes a CLIENT:                                                |
|                                                                       |
| → clients.deleted_at = NOW()                                          |
|                                                                       |
| → ALL invoices for that client: invoices.deleted_at = NOW()           |
|                                                                       |
| → Cron skips these invoices automatically (deleted_at IS NOT NULL)    |
|                                                                       |
| → Historical reminder_logs remain untouched                           |
|                                                                       |
| User deletes an INVOICE:                                              |
|                                                                       |
| → invoices.deleted_at = NOW()                                         |
|                                                                       |
| → Cron skips this invoice                                             |
|                                                                       |
| → reminder_logs remain intact                                         |
|                                                                       |
| Admin deletes a USER:                                                 |
|                                                                       |
| → users.deleted_at = NOW()                                            |
|                                                                       |
| → All clients, invoices, templates soft-deleted                       |
|                                                                       |
| → sessions invalidated                                                |
|                                                                       |
| → subscriptions cancelled                                             |
|                                                                       |
| → Data retained for 90 days, then eligible for purge                  |
+-----------------------------------------------------------------------+

**7. Email Deliverability & Failure Visibility ★**

Your product value lives or dies on email delivery. Users who think
reminders were sent --- but they weren\'t --- will churn and blame your
app.

**7.1 Email Provider Setup**

-   Use a transactional email provider. Never raw SMTP or Gmail API.

-   Recommended: Postmark (best deliverability), Resend
    (developer-friendly), or SendGrid

-   Required DNS records: SPF, DKIM, DMARC on your sending domain

-   Sending domain should be reminders@yourpayo.com --- never a Gmail or
    generic address

**7.2 Required Email Headers**

+-----------------------------------------------------------------------+
| From: Payo Reminders \<reminders@yourpayo.com\>                       |
|                                                                       |
| Reply-To: user\'s own business email (not Payo\'s address)            |
|                                                                       |
| X-Entity-Ref-ID: invoice_id (deduplication key)                       |
|                                                                       |
| List-Unsubscribe:                                                     |
| \<mailto:unsubscribe@yourpayo.com?subject=unsubscribe-{user_id}\>     |
|                                                                       |
| Message-ID: generated per send (provider handles this)                |
+-----------------------------------------------------------------------+

**7.3 Failure Visibility in UI ★**

This is what the original spec was missing. Users must be able to see
delivery status without contacting support.

  -----------------------------------------------------------------------
  **ℹ️ Required UI Elements for Delivery Status**

  \"Last reminder sent\" badge on every invoice: shows date + status icon
  (✓ sent, ✗ failed, ⚠ bounced)

  Invoice detail view: full reminder history with per-send status

  Warning banner on invoice: \"Last 3 reminder attempts failed --- check
  client email address\" (triggers when consecutive_failures \>= 3)

  Client list: bounced email badge next to client name when email_status
  = \"bounced\"

  Dashboard notification: \"X reminders failed to deliver this week\"
  with link to affected invoices
  -----------------------------------------------------------------------

**7.4 Bounce & Complaint Handling**

-   Register webhook endpoint with your email provider for: bounce,
    spam_complaint, delivery

-   On hard bounce: set clients.email_status = \"bounced\", pause all
    reminders to that address, notify user

-   On spam complaint: set clients.email_status = \"complained\", pause
    reminders, notify user

-   On soft bounce (temporary): increment consecutive_failures, do not
    change email_status yet

-   After 3 consecutive soft bounces: treat as hard bounce

**8. Authentication & Security**

**8.1 Auth Flow**

-   JWT or server-side sessions --- choose one and document it in your
    .env

-   Standard session: 24 hours. \"Remember me\": 7 days. Store token
    hash in sessions table.

-   Password reset: email link with HMAC-signed token, expires in 1 hour

-   Email verification: required before sending any reminder. Soft gate
    --- user can browse, not send.

-   Rate limit logins: max 5 attempts per 15 minutes per IP → return
    HTTP 429

**8.2 Reminder Rate Limiting (Anti-Spam)**

  -----------------------------------------------------------------------
  **⚠️ Implement This --- Without It Users Can Spam Their Clients**

  Max 3 manual reminder sends per invoice per 24-hour window

  Max 10 total reminder sends per user account per hour

  Cron sends are exempt (already gated by next_reminder_date)

  Blocked sends: log to reminder_logs with status = \"blocked\"

  Return HTTP 429: \"You\'ve reached the reminder limit. Try again
  later.\"

  Show remaining sends in tooltip on the Send Reminder Now button
  -----------------------------------------------------------------------

**8.3 Data Isolation**

-   Every query includes WHERE user_id = current_user.id --- enforced at
    query layer

-   Admin routes check is_admin = true on EVERY request --- not just at
    login

-   Never return hashed_password or session tokens in any API response

-   Validate that invoice.user_id matches authenticated user before any
    action

**9. Backoffice (Admin Panel)**

**9.1 Admin Dashboard**

-   Totals: active users, trial users, overdue subscriptions, suspended
    accounts

-   Revenue this month (manual tally from subscription_history table ---
    no automated accounting)

-   \"Needs Review\" panel: users with overdue_since \> 30 days, with
    one-click Suspend button

-   Recent admin actions feed (from admin_logs) --- last 20 actions with
    actor, action, target

**9.2 Users Table**

-   Columns: email, business_name, plan, subscription_status,
    trial_ends_at, next_payment_date

-   Per-row actions: Send Reminder, Mark as Paid, Suspend, Reactivate,
    View Details, Change Plan

-   Every action writes to admin_logs with previous_value and new_value

-   Search by email, filter by status and plan

**9.3 User Billing History (for Users)**

Users can see their own payment history in their account settings. This
eliminates \"did I pay?\" support emails.

-   Location: Settings → Billing

-   Shows: plan, amount, period covered, paid_at date --- from
    subscription_history

-   Admin can also view this per-user from the backoffice user detail
    page

**9.4 Subscription Payment Email Template**

+-----------------------------------------------------------------------+
| Subject: Your Payo {{plan_type}} subscription payment is due          |
|                                                                       |
| Hi {{user_name}},                                                     |
|                                                                       |
| Your Payo {{plan_type}} plan ({{billing_cycle}}) payment of           |
|                                                                       |
| {{amount}} {{currency}} is due on {{due_date}}.                       |
|                                                                       |
| Please send payment via Payoneer to:                                  |
|                                                                       |
| {{PAYONEER_EMAIL}} ← environment variable only, never hardcoded       |
|                                                                       |
| Once sent, reply to this email with your payment reference            |
|                                                                       |
| and we will update your account within 24 hours.                      |
|                                                                       |
| Questions? Reply to this email.                                       |
|                                                                       |
| The Payo Team                                                         |
+-----------------------------------------------------------------------+

**10. Frontoffice UI --- Screen-by-Screen**

**10.1 Onboarding**

-   Step 1: Business name

-   Step 2: Default reminder tone --- with clear descriptions of each
    (Friendly / Neutral / Firm)

-   Step 3: Verify email --- reminder sending gated until verified

-   No payment setup at onboarding. Trial starts immediately.

**10.2 Dashboard**

-   Summary cards: Outstanding, Overdue, Pending Confirmation, Paid This
    Month

-   Delivery health widget: \"X reminders delivered this week / Y
    failed\"

-   Recent activity: last 10 sends with status badges

-   Plan status banner (trial / overdue / suspended) --- contextual, not
    always visible

**10.3 Invoice Table**

-   Columns: invoice #, client, amount, currency, due date, status, last
    reminder, delivery status

-   Status badges: upcoming (blue), pending (yellow), overdue_1
    (orange), overdue_2 (red), paid (green), uncollectible (gray)

-   Delivery badge per row: ✓ Delivered / ✗ Failed / ⚠ Bounced / --- Not
    sent yet

-   Filters: status, client, date range, delivery status

-   Actions: Mark Paid, Client Says Paid, Write Off, Send Now
    (rate-limited)

**10.4 Template Studio**

-   View all 20 system templates with full preview

-   Clone to create a user_custom version

-   Editor: subject line + HTML body, variable picker button

-   Preview mode: renders with sample data before saving

-   System templates cannot be edited or deleted --- only cloned

**11. Recommended Build Order**

Ship in this exact sequence. Each phase is self-contained and testable
before you move to the next.

  ---------- ------------------ ------------------------------------------
  **Phase    **Schema & Auth**  All tables, migrations, registration,
  1**                           login, sessions, email verification, soft
                                deletes

  ---------- ------------------ ------------------------------------------

  ---------- ------------------ ------------------------------------------
  **Phase    **Trial Logic**    Trial state on signup, trial expiry cron,
  2**                           plan limits enforcement

  ---------- ------------------ ------------------------------------------

  ---------- ------------------ ------------------------------------------
  **Phase    **Templates**      Seed all 20 system templates, resolver
  3**                           logic, variable rendering, preview

  ---------- ------------------ ------------------------------------------

  ---------- ------------------ ------------------------------------------
  **Phase    **Client & Invoice Full create/read/update/soft-delete for
  4**        CRUD**             clients and invoices

  ---------- ------------------ ------------------------------------------

  ---------- ------------------ ------------------------------------------
  **Phase    **State Machine**  Status transitions, all manual user
  5**                           actions (paid, write-off, etc.)

  ---------- ------------------ ------------------------------------------

  ---------- ------------------ ------------------------------------------
  **Phase    **Frontoffice      Consolidation, template resolution, email
  6**        Cron**             sending, logging, failure tracking

  ---------- ------------------ ------------------------------------------

  ---------- ------------------ ------------------------------------------
  **Phase    **Frontoffice UI** Dashboard, invoice table, client list,
  7**                           reminder history, template studio

  ---------- ------------------ ------------------------------------------

  ---------- ------------------ ------------------------------------------
  **Phase    **Backoffice       Subscription tracking, admin cron, grace
  8**        Logic**            period enforcement, admin_logs

  ---------- ------------------ ------------------------------------------

  ---------- ------------------ ------------------------------------------
  **Phase    **Backoffice UI**  Admin dashboard, users table, billing
  9**                           history, manual actions, audit log view

  ---------- ------------------ ------------------------------------------

  ---------- ------------------ ------------------------------------------
  **Phase    **Hardening**      Rate limiting, bounce webhooks, input
  10**                          validation, security audit, load test cron

  ---------- ------------------ ------------------------------------------

**12. Environment Variables**

Every secret lives here. Nothing sensitive is hardcoded in source code.
Ever.

+-----------------------------------------------------------------------+
| \# ─── Database ───────────────────────────────────────────────       |
|                                                                       |
| DATABASE_URL=postgresql://user:pass@host:5432/payo                    |
|                                                                       |
| \# ─── Auth ───────────────────────────────────────────────────       |
|                                                                       |
| JWT_SECRET=long_random_secret_minimum_64_chars                        |
|                                                                       |
| SESSION_EXPIRY_HOURS=24                                               |
|                                                                       |
| SESSION_REMEMBER_ME_DAYS=7                                            |
|                                                                       |
| PASSWORD_RESET_EXPIRY_MINUTES=60                                      |
|                                                                       |
| \# ─── Email provider ─────────────────────────────────────────       |
|                                                                       |
| EMAIL_PROVIDER=postmark                                               |
|                                                                       |
| EMAIL_PROVIDER_API_KEY=your_api_key_here                              |
|                                                                       |
| EMAIL_FROM_ADDRESS=reminders@yourpayo.com                             |
|                                                                       |
| EMAIL_FROM_NAME=Payo Reminders                                        |
|                                                                       |
| EMAIL_WEBHOOK_SECRET=to_verify_bounce_webhook_payloads                |
|                                                                       |
| \# ─── Backoffice payment (admin only) ────────────────────────       |
|                                                                       |
| PAYONEER_EMAIL=your@payoneer.com                                      |
|                                                                       |
| \# ─── Trial ──────────────────────────────────────────────────       |
|                                                                       |
| TRIAL_DAYS=14                                                         |
|                                                                       |
| \# ─── Rate limiting ──────────────────────────────────────────       |
|                                                                       |
| MAX_MANUAL_REMINDERS_PER_INVOICE_PER_DAY=3                            |
|                                                                       |
| MAX_REMINDERS_PER_USER_PER_HOUR=10                                    |
|                                                                       |
| \# ─── App ────────────────────────────────────────────────────       |
|                                                                       |
| APP_URL=https://yourpayo.com                                          |
|                                                                       |
| NODE_ENV=production                                                   |
|                                                                       |
| CRON_SECRET=random_string_to_authenticate_cron_calls                  |
+-----------------------------------------------------------------------+

**13. Non-Negotiable Rules**

These are the rules that protect you from building the wrong thing. Read
them before every feature.

  -----------------------------------------------------------------------
  **🚨 ABSOLUTE RULES --- NEVER VIOLATE THESE**

  NEVER put Payoneer email, payment links, or payment instructions in
  frontoffice templates

  NEVER hard-delete rows --- always soft-delete (deleted_at)

  NEVER auto-suspend a user --- admin must click Suspend manually

  NEVER send more than one email per client per cron cycle --- always
  consolidate

  NEVER skip reminder_logs --- every send attempt must be recorded, even
  failures

  NEVER store pre-formatted currency strings --- store raw amount +
  currency code only

  ALWAYS check subscription_status before allowing reminder sends

  ALWAYS include List-Unsubscribe header in every outbound email

  ALWAYS write to admin_logs for every admin action with before/after
  state

  ALWAYS check deleted_at IS NULL in every query on soft-deletable tables
  -----------------------------------------------------------------------

**You now have a complete, production-ready blueprint.**

*The only remaining question is: when do you start?*

*--- End of Payo Master Product Specification v3.0 ---*
