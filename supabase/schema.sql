-- Run in Supabase SQL Editor to enable per-account Row Level Security.
-- Existing household rows are left unowned (owner_id = NULL) and become
-- inaccessible to application users. Assign them to the correct auth.users.id
-- using a trusted admin process only after confirming their rightful owner.
-- Existing policies are preserved. The restrictive owner guards below enforce
-- ownership even if an older permissive policy is broader than intended.

create extension if not exists pgcrypto;

-- Research administrator allowlist. Members can read the aggregated study
-- dataset through public.admin_research_dataset(); the table itself is not
-- readable with the public API key.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, public, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  monthly_consumption numeric(12, 2) not null check (monthly_consumption >= 0),
  bill_amount numeric(12, 2) not null check (bill_amount >= 0),
  rate numeric(12, 2) not null default 12 check (rate > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appliances (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  wattage numeric(12, 2) not null check (wattage > 0),
  quantity integer not null check (quantity > 0),
  hours_per_day numeric(5, 2) not null check (hours_per_day >= 0 and hours_per_day <= 24),
  days_per_month integer not null check (days_per_month >= 0 and days_per_month <= 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  phone text not null default '',
  home_address text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists display_name text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists home_address text not null default '',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.profiles from anon, public;
grant select on public.profiles to authenticated;

create or replace function public.create_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name, phone, home_address)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'home_address', '')
  )
  on conflict (user_id) do nothing;

  -- Keep the research dashboard available even when the account is created
  -- after this script first ran.
  if lower(coalesce(new.email, '')) = 'shyttyplays@gmail.com' then
    insert into public.admin_users (user_id) values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.create_profile_for_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_new_auth_user();

-- Backfill accounts created before the profile trigger was installed.
insert into public.profiles (user_id, display_name, phone, home_address)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'display_name', ''),
  coalesce(users.raw_user_meta_data ->> 'phone', ''),
  coalesce(users.raw_user_meta_data ->> 'home_address', '')
from auth.users as users
on conflict (user_id) do nothing;

-- Grant the research dashboard to this account. Re-run this statement after
-- creating the account if it did not exist when this script first ran.
insert into public.admin_users (user_id)
select id from auth.users where lower(email) = 'shyttyplays@gmail.com'
on conflict (user_id) do nothing;

-- Add ownership to an existing prototype table without claiming its old rows.
alter table public.households
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

create unique index if not exists households_owner_id_key
  on public.households (owner_id);

create index if not exists appliances_household_id_idx
  on public.appliances (household_id);

alter table public.households enable row level security;
alter table public.appliances enable row level security;

drop policy if exists "households_select_own" on public.households;
drop policy if exists "households_insert_own" on public.households;
drop policy if exists "households_update_own" on public.households;
drop policy if exists "households_delete_own" on public.households;
drop policy if exists "households_owner_guard" on public.households;
drop policy if exists "appliances_select_own" on public.appliances;
drop policy if exists "appliances_insert_own" on public.appliances;
drop policy if exists "appliances_update_own" on public.appliances;
drop policy if exists "appliances_delete_own" on public.appliances;
drop policy if exists "appliances_owner_guard" on public.appliances;

create policy "households_select_own"
  on public.households for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "households_insert_own"
  on public.households for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "households_update_own"
  on public.households for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "households_delete_own"
  on public.households for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy "households_owner_guard"
  on public.households as restrictive for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "appliances_select_own"
  on public.appliances for select to authenticated
  using (
    exists (
      select 1
      from public.households
      where households.id = appliances.household_id
        and households.owner_id = (select auth.uid())
    )
  );

create policy "appliances_insert_own"
  on public.appliances for insert to authenticated
  with check (
    exists (
      select 1
      from public.households
      where households.id = appliances.household_id
        and households.owner_id = (select auth.uid())
    )
  );

create policy "appliances_update_own"
  on public.appliances for update to authenticated
  using (
    exists (
      select 1
      from public.households
      where households.id = appliances.household_id
        and households.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.households
      where households.id = appliances.household_id
        and households.owner_id = (select auth.uid())
    )
  );

create policy "appliances_delete_own"
  on public.appliances for delete to authenticated
  using (
    exists (
      select 1
      from public.households
      where households.id = appliances.household_id
        and households.owner_id = (select auth.uid())
    )
  );

create policy "appliances_owner_guard"
  on public.appliances as restrictive for all to authenticated
  using (
    exists (
      select 1
      from public.households
      where households.id = appliances.household_id
        and households.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.households
      where households.id = appliances.household_id
        and households.owner_id = (select auth.uid())
    )
  );

revoke all on public.households, public.appliances from anon, public;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.households, public.appliances to authenticated;

-- ---------------------------------------------------------------------------
-- Research study tables (activity log and saved optimization scenario)
-- ---------------------------------------------------------------------------

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in (
    'signed_up',
    'signed_in',
    'page_view',
    'household_saved',
    'appliance_saved',
    'appliance_deleted',
    'report_exported',
    'report_printed'
  )),
  detail jsonb not null default '{}'::jsonb check (octet_length(detail::text) <= 8192),
  created_at timestamptz not null default now()
);

create index if not exists usage_events_user_created_idx
  on public.usage_events (user_id, created_at desc);

create index if not exists usage_events_created_idx
  on public.usage_events (created_at desc);

alter table public.usage_events enable row level security;

drop policy if exists "usage_events_select_own" on public.usage_events;
drop policy if exists "usage_events_insert_own" on public.usage_events;

create policy "usage_events_select_own"
  on public.usage_events for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "usage_events_insert_own"
  on public.usage_events for insert to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on public.usage_events from anon, public;
grant select, insert on public.usage_events to authenticated;

create table if not exists public.optimization_scenarios (
  user_id uuid primary key references auth.users(id) on delete cascade,
  proposed_hours jsonb not null default '{}'::jsonb,
  baseline_kwh numeric(12, 2) not null default 0 check (baseline_kwh >= 0),
  projected_kwh numeric(12, 2) not null default 0 check (projected_kwh >= 0),
  saved_kwh numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.optimization_scenarios enable row level security;

drop policy if exists "optimization_scenarios_select_own" on public.optimization_scenarios;
drop policy if exists "optimization_scenarios_insert_own" on public.optimization_scenarios;
drop policy if exists "optimization_scenarios_update_own" on public.optimization_scenarios;
drop policy if exists "optimization_scenarios_delete_own" on public.optimization_scenarios;

create policy "optimization_scenarios_select_own"
  on public.optimization_scenarios for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "optimization_scenarios_insert_own"
  on public.optimization_scenarios for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "optimization_scenarios_update_own"
  on public.optimization_scenarios for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "optimization_scenarios_delete_own"
  on public.optimization_scenarios for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.optimization_scenarios from anon, public;
grant select, insert, update, delete on public.optimization_scenarios to authenticated;

-- Single admin-only read entry point for the research dashboard. It is
-- SECURITY DEFINER so it can read auth.users and every participant's rows;
-- callers are rejected unless they are listed in public.admin_users.
create or replace function public.admin_research_dataset()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  dataset jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only research administrators can read this dataset.'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'accounts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', account_rows.id,
        'email', account_rows.email,
        'created_at', account_rows.created_at,
        'last_sign_in_at', account_rows.last_sign_in_at,
        'email_confirmed_at', account_rows.email_confirmed_at
      ) order by account_rows.created_at desc)
      from auth.users as account_rows
    ), '[]'::jsonb),
    'profiles', coalesce((
      select jsonb_agg(to_jsonb(profile_rows) order by profile_rows.created_at desc)
      from public.profiles as profile_rows
    ), '[]'::jsonb),
    'households', coalesce((
      select jsonb_agg(to_jsonb(household_rows) order by household_rows.created_at desc)
      from public.households as household_rows
      where household_rows.owner_id is not null
    ), '[]'::jsonb),
    'appliances', coalesce((
      select jsonb_agg(to_jsonb(appliance_rows) order by appliance_rows.created_at asc)
      from public.appliances as appliance_rows
    ), '[]'::jsonb),
    'scenarios', coalesce((
      select jsonb_agg(to_jsonb(scenario_rows) order by scenario_rows.updated_at desc)
      from public.optimization_scenarios as scenario_rows
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', event_rows.user_id,
        'event_type', event_rows.event_type,
        'event_count', event_rows.event_count,
        'last_event_at', event_rows.last_event_at
      ) order by event_rows.last_event_at desc)
      from (
        select user_id, event_type, count(*) as event_count, max(created_at) as last_event_at
        from public.usage_events
        group by user_id, event_type
      ) as event_rows
    ), '[]'::jsonb),
    'recent_events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', recent_rows.user_id,
        'event_type', recent_rows.event_type,
        'detail', recent_rows.detail,
        'created_at', recent_rows.created_at
      ) order by recent_rows.created_at desc)
      from (
        select user_id, event_type, detail, created_at,
          row_number() over (partition by user_id order by created_at desc) as position
        from public.usage_events
      ) as recent_rows
      where recent_rows.position <= 30
    ), '[]'::jsonb)
  ) into dataset;

  return dataset;
end;
$$;

revoke all on function public.admin_research_dataset() from public, anon;
grant execute on function public.admin_research_dataset() to authenticated;
