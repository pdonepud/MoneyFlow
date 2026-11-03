# Product Requirements — MoneyFlow

## 1. Product vision
Help a user make a deliberate plan for every paycheck, understand how much they can safely spend, build savings toward named goals, and evaluate purchases or financing before committing.

## 2. Primary user
A person paid weekly who has recurring household obligations, including their own rent and a family member's rent, credit-card debt, a phone bill, savings goals, and occasional large purchases.

## 3. Product principles
1. **Obligations first:** upcoming rent, required bills, and minimum debt payments must be accounted for before discretionary recommendations.
2. **No double-counting:** a paycheck allocation and a bill payment must not both reduce available funds twice.
3. **Deterministic math:** the app's budget engine produces the numeric answer. AI may explain that answer and ask for missing context, but may not invent or override the computed figures.
4. **Conservative affordability:** include a buffer and distinguish affordable, tight, and not-yet-affordable.
5. **Transparent assumptions:** show which paycheck, dates, bills, amounts, and assumptions produced a recommendation.
6. **Manual-first MVP:** no bank integration required.

## 4. Core user journeys
### 4.1 Set up budget
User enters net pay frequency, next payday, rent obligations, bill amounts/due dates, debt balance/APR/minimum, emergency buffer preference, and goals.

### 4.2 Record a paycheck
User records paycheck date and net amount. App creates a history entry and recalculates upcoming allocations, safe spending allowance, and goal contributions.

### 4.3 Understand spending limits
Dashboard shows available discretionary budget per paycheck, week, and day, with upcoming obligations and a clear explanation.

### 4.4 Review a purchase
User enters item, price, desired purchase date, and optional details in a compact chatbox. The advisor returns a recommendation (buy now / wait / avoid for now), budget impact, key reasons, and a practical alternative such as a savings schedule.

### 4.5 Evaluate financing
User enters price, down payment, APR, term, fees, and estimated recurring ownership costs where relevant. App computes estimated payment and total repayment, then checks the payment against projected budget after obligations and existing commitments.

### 4.6 Track savings goals
User creates goals (e.g., motorcycle, Meta Quest 3), target amount, target date, and current saved amount. App estimates a contribution and time-to-goal.

## 5. MVP scope
- Responsive dashboard.
- User-entered financial setup.
- Paycheck entry and paycheck history.
- Separate rent records for user and brother.
- Recurring bill list and due dates.
- Credit-card balance and payoff tracking.
- Goal tracking.
- Weekly, daily, and monthly discretionary spending allowance.
- Purchase chat/review with contextual budget summary.
- Financing affordability calculator.
- Clear budget assumptions and calculations.
- Basic authentication and per-user data isolation before cloud deployment.

## 6. Out of scope for MVP
- Bank account aggregation or automatic transaction imports.
- Moving money, making payments, or purchasing products.
- Credit-score prediction.
- Tax advice or investment execution.
- Shared multi-user household accounts.
- Native iOS/Android apps.

## 7. Functional requirements
- FR-1: User can enter and edit net paychecks.
- FR-2: Each paycheck is retained in chronological history.
- FR-3: User and brother's rent are independently named, scheduled, and tracked.
- FR-4: Recurring obligations can be assigned due dates and paid/unpaid status.
- FR-5: Budget engine reserves obligations due before the next expected income, plus configured buffers.
- FR-6: Dashboard shows remaining discretionary funds and per-day/per-week limits.
- FR-7: User can create, edit, and archive savings goals.
- FR-8: Purchase review uses the current calculated budget state and reports the effect of the proposed purchase.
- FR-9: Financing review shows estimated payment, total repayment, and budget fit.
- FR-10: App explains the calculation inputs and assumptions.
- FR-11: Empty, loading, error, and insufficient-data states are handled.

## 8. Non-functional requirements
- Responsive and accessible UI.
- Currency values stored as integer cents; avoid floating-point currency math.
- Validate inputs on client and server.
- Secrets (including AI API key) remain server-side.
- Database access is protected by authentication and row-level security.
- Automated tests cover budget and financing calculations.
- AI output is treated as untrusted content and cannot execute actions.

## 9. Success criteria
- User can enter a paycheck and understand its allocation in under two minutes.
- Every recommendation can be traced to displayed inputs and deterministic calculations.
- No committed obligation is silently treated as discretionary money.
- Phase 1 dashboard and paycheck history work with realistic sample data and are tested on desktop and mobile widths.
