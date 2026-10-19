-- Run in Supabase SQL Editor to enable per-account Row Level Security.
-- Existing household rows are left unowned (owner_id = NULL) and become
-- inaccessible to application users. Assign them to the correct auth.users.id
-- using a trusted admin process only after confirming their rightful owner.
-- Existing policies are preserved. The restrictive owner guards below enforce
-- ownership even if an older permissive policy is broader than intended.

create extension if not exists pgcrypto;

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
