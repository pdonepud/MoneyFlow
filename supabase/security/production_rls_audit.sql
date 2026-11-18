-- MoneyFlow production security audit (read-only).
-- Run in Supabase SQL Editor. Do not paste JWTs, user emails, or financial records.
-- Expected: six finance tables, RLS enabled, and owner-only policies for
-- SELECT, INSERT, UPDATE, DELETE. Inspect any unexpected policies manually.

-- 1. Table RLS and FORCE RLS status.
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r','p')
  and c.relname in (
    'paychecks','obligations','budget_settings',
    'savings_goals','savings_preferences','financing_scenarios'
  )
order by c.relname;

-- 2. Review every policy (including any added outside migrations).
select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'paychecks','obligations','budget_settings',
    'savings_goals','savings_preferences','financing_scenarios'
  )
order by tablename, cmd, policyname;

-- 3. Confirm anon has no direct table privileges; authenticated has CRUD.
select c.relname as table_name,
       has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
       has_table_privilege('anon', c.oid, 'INSERT') as anon_insert,
       has_table_privilege('anon', c.oid, 'UPDATE') as anon_update,
       has_table_privilege('anon', c.oid, 'DELETE') as anon_delete,
       has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select,
       has_table_privilege('authenticated', c.oid, 'INSERT') as authenticated_insert,
       has_table_privilege('authenticated', c.oid, 'UPDATE') as authenticated_update,
       has_table_privilege('authenticated', c.oid, 'DELETE') as authenticated_delete
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r','p')
  and c.relname in (
    'paychecks','obligations','budget_settings',
    'savings_goals','savings_preferences','financing_scenarios'
  )
order by c.relname;

-- 4. Confirm the AI quota function is not executable by anon.
select p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='consume_advisor_quota';
