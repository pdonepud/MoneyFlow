-- MoneyFlow Phase 5, Stage 2: account-owned storage.
-- Run in Supabase Dashboard > SQL Editor on the MoneyFlow project.
-- All monetary values are integer US cents. Never put a service-role key in the browser.
-- This migration creates empty tables. It does not import or delete browser data.

create table if not exists public.paychecks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  received_on date not null,
  amount_cents bigint not null check (amount_cents > 0),
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);

create table if not exists public.obligations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  category text not null check (category in ('your-rent','family-rent','phone','credit-card-minimum','utilities','other')),
  amount_cents bigint not null check (amount_cents > 0),
  due_day integer not null check (due_day between 1 and 31),
  paid_for_month text check (paid_for_month is null or paid_for_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  created_at timestamptz not null default now()
);

create table if not exists public.budget_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  balance_cents bigint not null default 0 check (balance_cents >= 0),
  buffer_cents bigint not null default 0 check (buffer_cents >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  target_cents bigint not null check (target_cents > 0),
  saved_cents bigint not null default 0 check (saved_cents >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.savings_preferences (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  priority_goal_id uuid,
  updated_at timestamptz not null default now()
);

create table if not exists public.financing_scenarios (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  price_cents bigint not null check (price_cents > 0),
  down_payment_cents bigint not null check (down_payment_cents >= 0 and down_payment_cents <= price_cents),
  apr_percent numeric(6,3) not null check (apr_percent between 0 and 100),
  term_months integer not null check (term_months in (12,24,36,48,60)),
  insurance_cents bigint not null default 0 check (insurance_cents >= 0),
  fuel_cents bigint not null default 0 check (fuel_cents >= 0),
  maintenance_cents bigint not null default 0 check (maintenance_cents >= 0),
  updated_at timestamptz not null default now()
);

-- A priority goal must belong to the same user; prevent cross-account references.
create unique index if not exists savings_goals_user_id_id_idx on public.savings_goals(user_id, id);
alter table public.savings_preferences
  add constraint savings_preferences_owned_goal_fk
  foreign key (user_id, priority_goal_id)
  references public.savings_goals(user_id, id)
  on delete set null (priority_goal_id);

create index if not exists paychecks_user_received_idx on public.paychecks(user_id, received_on desc);
create index if not exists obligations_user_idx on public.obligations(user_id);
create index if not exists savings_goals_user_idx on public.savings_goals(user_id);

alter table public.paychecks enable row level security;
alter table public.obligations enable row level security;
alter table public.budget_settings enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_preferences enable row level security;
alter table public.financing_scenarios enable row level security;

-- Apply owner-only policies to SELECT, INSERT, UPDATE and DELETE.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'paychecks', 'obligations', 'budget_settings',
    'savings_goals', 'savings_preferences', 'financing_scenarios'
  ] loop
    execute format('drop policy if exists owner_select on public.%I', table_name);
    execute format('drop policy if exists owner_insert on public.%I', table_name);
    execute format('drop policy if exists owner_update on public.%I', table_name);
    execute format('drop policy if exists owner_delete on public.%I', table_name);
    execute format('create policy owner_select on public.%I for select to authenticated using (user_id = (select auth.uid()))', table_name);
    execute format('create policy owner_insert on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', table_name);
    execute format('create policy owner_update on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', table_name);
    execute format('create policy owner_delete on public.%I for delete to authenticated using (user_id = (select auth.uid()))', table_name);
  end loop;
end $$;

-- Only authenticated users can access the app tables through the API.
revoke all on public.paychecks, public.obligations, public.budget_settings,
  public.savings_goals, public.savings_preferences, public.financing_scenarios from anon;
grant select, insert, update, delete on public.paychecks, public.obligations,
  public.budget_settings, public.savings_goals, public.savings_preferences,
  public.financing_scenarios to authenticated;
