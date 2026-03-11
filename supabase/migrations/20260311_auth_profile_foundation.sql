create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  ut_eid text not null,
  major text not null,
  current_semester text not null,
  gpa numeric(3,2),
  residency text not null,
  financial_need text not null,
  completed_courses jsonb not null default '[]'::jsonb,
  resume_summary text,
  skills jsonb not null default '[]'::jsonb,
  interests jsonb not null default '[]'::jsonb,
  club_interests jsonb not null default '[]'::jsonb,
  hours_per_week integer,
  profile_photo_url text,
  transcript_file_name text,
  resume_file_name text,
  transcript_upload_status text not null default 'missing',
  resume_upload_status text not null default 'missing',
  legacy_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profile_settings (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  gpa_public boolean not null default true,
  auth_status text not null default 'pending_verification',
  account_mode text not null default 'supabase',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists student_profiles_set_updated_at on public.student_profiles;
create trigger student_profiles_set_updated_at
before update on public.student_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists profile_settings_set_updated_at on public.profile_settings;
create trigger profile_settings_set_updated_at
before update on public.profile_settings
for each row
execute function public.set_updated_at();

alter table public.student_profiles enable row level security;
alter table public.profile_settings enable row level security;

drop policy if exists "student_profiles_select_own" on public.student_profiles;
create policy "student_profiles_select_own"
on public.student_profiles
for select
using (auth.uid() = auth_user_id);

drop policy if exists "student_profiles_insert_own" on public.student_profiles;
create policy "student_profiles_insert_own"
on public.student_profiles
for insert
with check (auth.uid() = auth_user_id);

drop policy if exists "student_profiles_update_own" on public.student_profiles;
create policy "student_profiles_update_own"
on public.student_profiles
for update
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

drop policy if exists "profile_settings_select_own" on public.profile_settings;
create policy "profile_settings_select_own"
on public.profile_settings
for select
using (auth.uid() = auth_user_id);

drop policy if exists "profile_settings_insert_own" on public.profile_settings;
create policy "profile_settings_insert_own"
on public.profile_settings
for insert
with check (auth.uid() = auth_user_id);

drop policy if exists "profile_settings_update_own" on public.profile_settings;
create policy "profile_settings_update_own"
on public.profile_settings
for update
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);
