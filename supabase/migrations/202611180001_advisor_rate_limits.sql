-- Per-account paid AI request quotas. Run in Supabase SQL Editor before enabling AI mode.
-- This function uses auth.uid() from the caller's JWT, not a user ID from the request.
create table if not exists public.advisor_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_kind text not null check (window_kind in ('minute', 'day')),
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, window_kind, window_start)
);
alter table public.advisor_usage enable row level security;
revoke all on public.advisor_usage from public, anon, authenticated;

create or replace function public.consume_advisor_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  minute_start timestamptz := date_trunc('minute', now());
  day_start timestamptz := date_trunc('day', now());
  minute_count integer;
  day_count integer;
begin
  if caller is null then return false; end if;
  -- Serialize quota checks for this user across concurrent requests.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller::text, 77231));

  select request_count into minute_count
  from public.advisor_usage
  where user_id=caller and window_kind='minute' and window_start=minute_start;
  select request_count into day_count
  from public.advisor_usage
  where user_id=caller and window_kind='day' and window_start=day_start;

  if coalesce(minute_count,0)>=3 or coalesce(day_count,0)>=20 then
    return false;
  end if;
  insert into public.advisor_usage(user_id,window_kind,window_start,request_count)
  values(caller,'minute',minute_start,1), (caller,'day',day_start,1)
  on conflict(user_id,window_kind,window_start)
  do update set request_count=public.advisor_usage.request_count+1;
  return true;
end;
$$;
revoke all on function public.consume_advisor_quota() from public, anon;
grant execute on function public.consume_advisor_quota() to authenticated;
