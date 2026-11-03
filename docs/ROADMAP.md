# Phased Roadmap

## Phase 1 — Foundation and dashboard
**Outcome:** A responsive app shell with paycheck entry/history and a clear dashboard using sample/local data initially.
- Initialize Next.js, TypeScript, Tailwind, shadcn/ui.
- Establish layout, navigation, typography, responsive patterns.
- Build dashboard summary cards and paycheck entry form.
- Build paycheck history list with edit/delete confirmation.
- Define typed domain models and currency/date utilities.
- Add empty/loading/error states and sample data.
- Add unit tests for paycheck validation and display calculations.
- No live AI or persistent financial database required until later phase.

## Phase 2 — Budget engine and obligations
**Outcome:** Reliable deterministic allocations.
- Setup wizard for net pay cadence and expected payday.
- Separate user rent and brother rent.
- Recurring bills, due dates, status.
- Credit-card debt and minimum payment tracking.
- Allocation policy, emergency buffer, paycheck-to-obligation matching.
- Daily/weekly/monthly discretionary limits.
- Unit tests for due-date edge cases, irregular pay, shortfalls, and no double-counting.

## Phase 3 — Goals and financing
**Outcome:** Goal plans and purchase/loan math.
- Savings goal CRUD and progress.
- Goal contribution recommendations and time-to-goal.
- Financing calculator (principal, APR, term, down payment, fees).
- Estimated monthly payment and total repayment.
- Affordability classifications and sensitivity to additional costs.
- Test financial math and rounding.

## Phase 4 — AI purchase advisor
**Outcome:** Chatbox evaluates a proposed purchase using computed budget facts.
- Server-side OpenAI API integration.
- Minimal budget context and structured response schema.
- Advice categories: buy now, wait/save, not affordable yet.
- Explanation, risk factors, and alternative savings plan.
- AI failure/timeout handling; deterministic result remains visible.
- Safety, prompt-injection, and consistency tests.

## Phase 5 — Persistence, auth, hardening, deployment
**Outcome:** Secure personal app accessible across devices.
- Supabase Auth and PostgreSQL migrations.
- Per-user row-level security.
- Persist all core financial records.
- Secure server routes and secrets.
- Playwright end-to-end checks.
- Deploy to Vercel; configure environment variables.
- Privacy review, backup/export consideration, and production checklist.
