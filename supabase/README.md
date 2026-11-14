# MoneyFlow Supabase database setup

## Stage 2A — create the database (manual step)

1. Open the Supabase project that supplies `NEXT_PUBLIC_SUPABASE_URL` in your local `.env.local`.
2. In Supabase Dashboard, open **SQL Editor** and create a new query.
3. Copy the **entire contents** of `supabase/migrations/202611140001_initial_finance_schema.sql` into the editor.
4. Review that this is the correct project and click **Run** once.
5. In **Table Editor**, confirm six new public tables exist.
6. In **Authentication**, verify the existing test account is still present.

This migration creates tables, constraints, and per-user RLS policies. It does **not** migrate data or change localStorage. Do not manually add financial data to these tables yet.

## Verify RLS

In Supabase Table Editor, each of the six tables should show RLS enabled. The SQL defines owner-only policies for select, insert, update, and delete, restricted to authenticated users. The SQL Editor runs with elevated privileges and does not simulate a signed-in app user, so it is **not** a reliable RLS isolation test.

Next stage: connect paychecks using the authenticated browser client and verify user A cannot access user B's records before moving other features. Avoid importing shared browser localStorage automatically into any account.

## Security

- Never put Supabase service-role/secret keys or database passwords into `.env.local` variables prefixed with `NEXT_PUBLIC_`.
- The browser should use only the publishable key, with RLS enabled.
- Current client-side route gating is not a substitute for server-side authorization.
- Do not publicly deploy the paid advisor API until it has authenticated access, rate limits, and usage controls.
