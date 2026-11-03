# MoneyFlow

MoneyFlow is a personal budgeting web app that allocates each paycheck to priority obligations, calculates safe discretionary spending, tracks goals and paycheck history, and provides a purchase/financing decision assistant.

## Product guardrails
- Rent and required bills are prioritized before discretionary purchases.
- The user's rent and their brother's rent are tracked as separate obligations.
- Budget math is deterministic application logic; the AI explains and contextualizes the computed result but does not calculate balances itself.
- A purchase review considers upcoming obligations, debt payments, emergency savings, current discretionary allowance, and existing financing commitments.
- Financing reviews include payment, APR, term, down payment, total repayment, and budget impact. “Technically fits” is not automatically “recommended.”
- Do not connect bank accounts in the MVP. User-entered data is the source of truth.
- Do not represent an AI response as professional financial advice or guarantee affordability.

## Documentation
- [Product requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Phased roadmap](docs/ROADMAP.md)
- [Phase 1 sprint plan](docs/PHASE_1_SPRINT_PLAN.md)
- [Definition of done](docs/DEFINITION_OF_DONE.md)

## Suggested stack
Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, Supabase (PostgreSQL + Auth), OpenAI API through server-side routes, Recharts, Zod, Vitest, Playwright, GitHub, and Vercel.
