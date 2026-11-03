# Phase 1 Sprint Plan

## Sprint cadence
Use one-week sprints for the initial build, with a short planning session at the start and demo/retro at the end. Phase 1 is two sprints (approximately two weeks). Estimates are relative story points; adjust after the first working session.

## Phase 1 goal
Deliver a responsive MoneyFlow dashboard where a user can enter a net paycheck, see a summary, and review paycheck history. The initial data may be local/sample data; cloud persistence and full budgeting rules are later phases.

## Sprint 1 — App foundation and dashboard shell
**Sprint goal:** The app runs locally with a polished responsive shell and a useful dashboard using sample data.

### Backlog
| ID | Story | Acceptance criteria | Estimate |
|---|---|---|---:|
| P1-01 | Initialize Next.js + TypeScript project | App starts locally; lint/typecheck pass; README includes setup steps | 3 |
| P1-02 | Add Tailwind and shadcn/ui foundation | Theme, reusable buttons/cards/inputs, consistent spacing | 3 |
| P1-03 | Create responsive app shell | Dashboard navigation works; mobile layout has no horizontal overflow | 5 |
| P1-04 | Create dashboard summary cards | Shows paycheck amount, reserved/available placeholder values, and next payday using labeled sample data | 3 |
| P1-05 | Create domain types and currency utilities | Currency stored/formatted safely; unit tests cover formatting and edge values | 3 |
| P1-06 | Add sample data and empty states | First-time user sees a clear onboarding/empty state; sample data is visibly labeled | 2 |

**Sprint 1 deliverable:** Dashboard shell with sample data, responsive layout, and project setup documentation.

## Sprint 2 — Paycheck entry and history
**Sprint goal:** User can enter paycheck details and review/update paycheck history.

### Backlog
| ID | Story | Acceptance criteria | Estimate |
|---|---|---|---:|
| P1-07 | Build paycheck entry form | Captures received date, net amount, optional note; required fields validated | 5 |
| P1-08 | Show paycheck history | Lists entries newest-first with date and net amount; handles empty state | 3 |
| P1-09 | Edit and delete paycheck entries | User can edit entry; delete requires confirmation; UI updates accurately | 5 |
| P1-10 | Add local persistence for Phase 1 | Refresh preserves entries; clear explanation that data is browser-local and not yet synced | 5 |
| P1-11 | Add paycheck flow tests | Tests validation and add/edit/delete; key browser flow passes | 5 |
| P1-12 | Sprint demo and polish | Keyboard/focus states, responsive checks, known issues documented | 3 |

**Sprint 2 deliverable:** Working paycheck management and history for the initial single-device prototype.

## Definition of ready
- Story has a clear user outcome.
- Acceptance criteria are testable.
- Design/content dependencies are known.
- No story assumes bank connection or live AI in Phase 1.

## Definition of done
- Code is reviewed (even if self-reviewed via a checklist).
- Lint and TypeScript checks pass.
- Relevant unit or browser tests pass.
- Responsive layout checked at mobile and desktop widths.
- No secrets or real personal financial data in source control.
- README/docs updated.
- Feature demonstrated in the running app.

## Risks and decisions
- Browser-local persistence is a prototype choice, not a secure cross-device solution. Supabase persistence and authentication belong in Phase 5.
- Avoid presenting sample numbers as the user's real budget.
- Keep the budget engine separate from UI components so Phase 2 can replace placeholders cleanly.
- Treat “spending allowance” as unimplemented until Phase 2 rules and obligations are in place.
