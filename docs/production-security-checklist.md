# MoneyFlow production security checklist

## Current state
- Supabase financial tables have RLS policies; validate each policy with two test accounts and direct API requests before production.
- Dashboard now verifies Supabase cookie sessions in Next.js middleware and again in the server-rendered home page. Test unauthenticated redirects, token expiry, and sign-out before production.
- Paid `POST /api/advisor` validates a Supabase bearer token, reads data under the user's JWT/RLS, and now consumes an atomic database quota **before** contacting OpenAI.
- The AI quota is **3 requests per UTC minute and 20 requests per UTC day per user**. Failed provider requests still consume a quota slot. Quotas limit abuse, but are not a spending cap.
- If the quota SQL migration is missing, the AI endpoint fails closed with HTTP 503.
- The free advisor does not call the paid AI endpoint.

## Required before public launch
1. Run `supabase/migrations/202611180001_advisor_rate_limits.sql` in Supabase SQL Editor. Confirm the `advisor_usage` table and `consume_advisor_quota` function exist.
2. Configure Supabase Auth site URL and allowed redirect URLs for your production Vercel domain and localhost.
3. In Vercel project settings, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. They are public browser configuration, not secrets. Only set `OPENAI_API_KEY` on the server if intentionally enabling paid AI; never use a `NEXT_PUBLIC_` prefix for it. Optional `OPENAI_ADVISOR_MODEL`.
4. Test the new Supabase SSR cookie session flow: sign in again after migration from localStorage, verify unauthenticated requests to / redirect to /login, refresh, sign out, and verify another account cannot access previous data.
5. Add a provider-side monthly spend limit/alerts and consider disabling AI mode for public users until billing safeguards and abuse monitoring are in place.
6. Confirm production RLS cross-account isolation for all six finance tables, including UPDATE and DELETE, not only reads. Verify anon requests cannot access data.
7. Check that only expected variables are deployed; never commit `.env.local`, Supabase service-role/secret keys, or OpenAI keys.
8. Review `npm audit` and upgrade vulnerable dependencies without blindly applying breaking fixes.
9. Confirm signup/email verification, logout, refresh, second-device login, and error states on the deployed URL.
10. After the SQL migration, test paid endpoint with no bearer token (expect 401), an invalid token (401), and a valid token with missing API key (503). With a configured API key, verify 3 requests per minute and a 429 on the fourth. The API will consume quota even when the provider fails.

## Deployment
Connect GitHub repo `pdonepud/MoneyFlow` to Vercel. Framework preset: Next.js. Run `npm install` to install @supabase/ssr, then `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` locally before deploying. Do not deploy paid AI publicly until above checks are complete.

## Migrations
The SQL Editor does not register executed files in Supabase CLI migration history. If adopting Supabase CLI later, reconcile existing schema migration history before `db push` to avoid attempting to reapply migrations.
