# MoneyFlow — Vercel deployment setup

## Prerequisites
- All checks pass locally: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Supabase migrations have been applied and RLS verified.
- Password reset end-to-end test remains deferred until the Supabase email rate limit resets; see `production-security-checklist.md`.

## Import the repository
1. Sign into https://vercel.com and choose **Add New → Project**.
2. Import GitHub repository `pdonepud/MoneyFlow` (authorize GitHub access if prompted).
3. Project name: `moneyflow` or another available name.
4. Framework preset: **Next.js**.
5. **Root Directory: `./`** (repository root; do not select the nested local `MoneyFlow` folder).
6. Leave Build Command as `next build` / framework default; Install Command as framework default. Do not set an output directory.
7. Configure environment variables before deploying:
   - `NEXT_PUBLIC_SUPABASE_URL` — copy your Supabase project URL from Supabase project settings.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — copy the public publishable key (not service-role/secret).
   - `ENABLE_PAID_ADVISOR=false` — explicitly disable the paid endpoint for initial deployment.
   - Do **not** add `OPENAI_API_KEY` until paid mode is intentionally enabled and billing safeguards are in place.
   - Optional `OPENAI_ADVISOR_MODEL` only when enabling paid mode.
   Set variables for Production; also Preview if testing preview deployments.
8. Deploy. Vercel will provide a `https://...vercel.app` URL. Copy the exact URL.

## Supabase authentication URLs
After Vercel assigns the actual domain, open **Supabase → Authentication → URL Configuration**:
- **Site URL**: use the actual production Vercel URL (e.g. `https://your-project.vercel.app`).
- **Redirect URLs**: allowlist `http://localhost:3000/auth/callback` and `https://your-project.vercel.app/auth/callback` (replace example with actual URL).
- If using preview deployments, add only the preview URLs/patterns you intend to trust.
- For production email templates and SMTP, ensure links use the intended production domain. Recovery emails must be retested after the email rate limit resets.

## Smoke tests after deploy
1. Open production URL in private browsing: `/` redirects to `/login`.
2. Sign in; dashboard renders, and refresh remains authenticated.
3. Add a test paycheck/bill; reload and verify persistence.
4. Test budget, goals, financing and free advisor with updated account values.
5. Sign out; `/` redirects to `/login`.
6. Sign in as a different account; ensure no first-account data appears.
7. Confirm `POST /api/advisor` returns 503 while `ENABLE_PAID_ADVISOR=false`. Do not expose a paid key yet.
8. Inspect Vercel deployment logs for errors without sharing tokens or credentials.

## Remaining release blockers
- Complete deferred password recovery test.
- Audit and remediate dependency vulnerabilities, verify database RLS for every table and operation.
- Validate auth callback and session refresh in production.
- If paid AI is ever enabled: set spending alerts/caps, confirm quotas, monitor abuse and review data/privacy disclosures.

## Notes
- `.env.local` is local only and must never be committed. Public Supabase keys are not secrets; service-role keys and OpenAI keys are secrets.
- Vercel auto-deploys new commits to the connected production branch.
- SQL migrations run manually in Supabase SQL Editor are not tracked by the Supabase CLI migration history.
