# Definition of Done

A story is complete when:
- Acceptance criteria are met and demonstrable.
- Inputs are validated; errors are understandable.
- Money calculations use integer cents or an appropriate decimal-safe method.
- No user data is accidentally hard-coded or committed.
- UI works at mobile and desktop breakpoints.
- Keyboard navigation and focus indicators are usable.
- Relevant automated tests pass.
- Lint and TypeScript checks pass.
- Documentation and known limitations are updated.
- The change is committed with a descriptive message.

For finance-related calculations:
- Include test cases for zero, negative/invalid input, rounding, and insufficient funds.
- Show assumptions and avoid claiming affordability when required inputs are missing.
- AI text must not override deterministic calculation results.
