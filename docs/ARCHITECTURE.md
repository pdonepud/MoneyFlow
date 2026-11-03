# Architecture — MoneyFlow

## System overview
- **Web:** Next.js App Router, React, TypeScript.
- **UI:** Tailwind CSS and shadcn/ui; Recharts for visual summaries.
- **Validation:** Zod schemas shared where appropriate.
- **Persistence/auth:** Supabase PostgreSQL and Supabase Auth.
- **AI:** OpenAI API called only from a server-side route. The route supplies a minimized, calculated budget summary, not unrestricted database access.
- **Testing:** Vitest for domain logic; Playwright for user flows.
- **Hosting:** Vercel; Supabase hosted database.

## Request flow
1. User submits or edits paycheck/budget data.
2. Server validates data and persists it for the authenticated user.
3. Domain budget engine calculates allocations and remaining discretionary funds.
4. UI renders the calculation and its assumptions.
5. For a purchase review, server passes the computed summary and user-provided purchase details to the AI.
6. AI returns structured reasoning/recommendation; server validates output and displays it alongside deterministic numbers.

## Key design decision: AI is not the calculator
The AI cannot determine the authoritative remaining balance. It receives computed values and explains tradeoffs. The app should reject or clearly flag malformed AI responses and continue to display the deterministic budget result.

## Domain modules
- `paychecks`: net paycheck records and history.
- `obligations`: rent, phone, recurring bills, due dates, status.
- `debts`: credit-card balance, APR, minimum, payments.
- `budget`: allocation engine, available funds, spending limits.
- `goals`: target, saved amount, contribution and ETA.
- `financing`: amortization estimate and affordability checks.
- `purchase-advisor`: contextual prompt and validated response.
- `auth`: session and user-level data access.

## Data model (initial)
- `profiles`: user preferences, currency, buffer policy.
- `paychecks`: user_id, received_at, net_amount_cents, notes.
- `obligations`: user_id, name, category, amount_cents, cadence, due_date, priority, status.
- `debts`: user_id, name, balance_cents, APR basis points, minimum_payment_cents.
- `debt_payments`: debt_id, paid_at, amount_cents.
- `goals`: user_id, name, target_cents, saved_cents, target_date, priority.
- `transactions`: user_id, date, amount_cents, category, note.
- `purchase_reviews`: user_id, created_at, item, price_cents, recommendation, summary.

All user-owned tables should enforce row-level security. Store money as integer cents. Define a clear policy for time zones and date-only due dates.

## Security and privacy
- Never expose the OpenAI API key in client bundles.
- Validate and authorize all mutations on the server.
- Apply Supabase RLS to user-owned data.
- Minimize financial context sent to the AI; do not send credentials or unnecessary personal data.
- Avoid logging raw financial data and full chat contents by default.
- Make clear that MVP does not connect to or move money from bank accounts.
