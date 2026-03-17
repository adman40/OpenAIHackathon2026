create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.academic_major_catalogs (
  catalog_id text primary key,
  level text not null,
  source_metadata jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.academic_majors (
  catalog_id text not null references public.academic_major_catalogs(catalog_id) on delete cascade,
  major_id text not null,
  display_name text not null,
  college text not null,
  level text not null,
  support_status text not null check (support_status in ('supported', 'planned')),
  normalized_plan_id text,
  degree_label text,
  specializations text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (catalog_id, major_id)
);

create table if not exists public.academic_degree_plan_catalogs (
  catalog_id text primary key,
  level text not null,
  source_metadata jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.academic_degree_plans (
  plan_id text primary key,
  catalog_id text not null references public.academic_degree_plan_catalogs(catalog_id) on delete cascade,
  degree_id text not null,
  major_id text not null,
  major_name text not null,
  aliases text[] not null default '{}',
  degree_name text not null,
  college text not null,
  level text not null,
  total_credits integer not null check (total_credits > 0),
  course_catalog_id text not null,
  support_status text not null check (support_status in ('supported', 'planned')),
  source_metadata jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.academic_requirement_buckets (
  plan_id text not null references public.academic_degree_plans(plan_id) on delete cascade,
  bucket_id text not null,
  title text not null,
  bucket_type text not null check (bucket_type in ('core', 'major', 'elective')),
  credits_required integer not null check (credits_required >= 0),
  course_ids text[] not null default '{}',
  notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (plan_id, bucket_id)
);

create table if not exists public.academic_course_catalogs (
  catalog_id text primary key,
  degree_id text not null,
  source_metadata jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.academic_courses (
  catalog_id text not null references public.academic_course_catalogs(catalog_id) on delete cascade,
  course_id text not null,
  course_name text not null,
  requirement_bucket text not null check (requirement_bucket in ('core', 'major', 'elective')),
  credits integer not null check (credits > 0),
  prerequisites text[] not null default '{}',
  terms_offered text[] not null default '{}',
  professor_name text not null default '',
  professor_difficulty text not null default '',
  grade_tendency text not null default '',
  attendance_policy text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (catalog_id, course_id)
);

create table if not exists public.academic_schedule_catalogs (
  catalog_id text primary key,
  level text not null,
  source_metadata jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.academic_term_offerings (
  schedule_catalog_id text not null references public.academic_schedule_catalogs(catalog_id) on delete cascade,
  course_catalog_id text not null,
  term text not null,
  is_regular_term boolean not null default true,
  offered_course_ids text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (schedule_catalog_id, course_catalog_id, term)
);

create table if not exists public.academic_course_equivalencies (
  course_catalog_id text not null,
  source_course_id text not null,
  equivalent_course_ids text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (course_catalog_id, source_course_id)
);

create table if not exists public.academic_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  sync_mode text not null,
  status text not null check (status in ('running', 'completed', 'failed')),
  notes text,
  record_counts jsonb not null default '{}'::jsonb,
  error_message text,
  finished_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists academic_degree_plans_catalog_idx
  on public.academic_degree_plans (catalog_id);

create index if not exists academic_courses_catalog_idx
  on public.academic_courses (catalog_id);

create index if not exists academic_term_offerings_catalog_idx
  on public.academic_term_offerings (schedule_catalog_id, course_catalog_id);

create index if not exists academic_course_equivalencies_catalog_idx
  on public.academic_course_equivalencies (course_catalog_id);

drop trigger if exists academic_major_catalogs_set_updated_at on public.academic_major_catalogs;
create trigger academic_major_catalogs_set_updated_at
before update on public.academic_major_catalogs
for each row execute function public.set_updated_at();

drop trigger if exists academic_majors_set_updated_at on public.academic_majors;
create trigger academic_majors_set_updated_at
before update on public.academic_majors
for each row execute function public.set_updated_at();

drop trigger if exists academic_degree_plan_catalogs_set_updated_at on public.academic_degree_plan_catalogs;
create trigger academic_degree_plan_catalogs_set_updated_at
before update on public.academic_degree_plan_catalogs
for each row execute function public.set_updated_at();

drop trigger if exists academic_degree_plans_set_updated_at on public.academic_degree_plans;
create trigger academic_degree_plans_set_updated_at
before update on public.academic_degree_plans
for each row execute function public.set_updated_at();

drop trigger if exists academic_requirement_buckets_set_updated_at on public.academic_requirement_buckets;
create trigger academic_requirement_buckets_set_updated_at
before update on public.academic_requirement_buckets
for each row execute function public.set_updated_at();

drop trigger if exists academic_course_catalogs_set_updated_at on public.academic_course_catalogs;
create trigger academic_course_catalogs_set_updated_at
before update on public.academic_course_catalogs
for each row execute function public.set_updated_at();

drop trigger if exists academic_courses_set_updated_at on public.academic_courses;
create trigger academic_courses_set_updated_at
before update on public.academic_courses
for each row execute function public.set_updated_at();

drop trigger if exists academic_schedule_catalogs_set_updated_at on public.academic_schedule_catalogs;
create trigger academic_schedule_catalogs_set_updated_at
before update on public.academic_schedule_catalogs
for each row execute function public.set_updated_at();

drop trigger if exists academic_term_offerings_set_updated_at on public.academic_term_offerings;
create trigger academic_term_offerings_set_updated_at
before update on public.academic_term_offerings
for each row execute function public.set_updated_at();

drop trigger if exists academic_course_equivalencies_set_updated_at on public.academic_course_equivalencies;
create trigger academic_course_equivalencies_set_updated_at
before update on public.academic_course_equivalencies
for each row execute function public.set_updated_at();

drop trigger if exists academic_import_runs_set_updated_at on public.academic_import_runs;
create trigger academic_import_runs_set_updated_at
before update on public.academic_import_runs
for each row execute function public.set_updated_at();

alter table public.academic_major_catalogs enable row level security;
alter table public.academic_majors enable row level security;
alter table public.academic_degree_plan_catalogs enable row level security;
alter table public.academic_degree_plans enable row level security;
alter table public.academic_requirement_buckets enable row level security;
alter table public.academic_course_catalogs enable row level security;
alter table public.academic_courses enable row level security;
alter table public.academic_schedule_catalogs enable row level security;
alter table public.academic_term_offerings enable row level security;
alter table public.academic_course_equivalencies enable row level security;
alter table public.academic_import_runs enable row level security;

drop policy if exists "academic major catalogs are readable" on public.academic_major_catalogs;
create policy "academic major catalogs are readable"
on public.academic_major_catalogs
for select
using (true);

drop policy if exists "academic majors are readable" on public.academic_majors;
create policy "academic majors are readable"
on public.academic_majors
for select
using (true);

drop policy if exists "academic degree plan catalogs are readable" on public.academic_degree_plan_catalogs;
create policy "academic degree plan catalogs are readable"
on public.academic_degree_plan_catalogs
for select
using (true);

drop policy if exists "academic degree plans are readable" on public.academic_degree_plans;
create policy "academic degree plans are readable"
on public.academic_degree_plans
for select
using (true);

drop policy if exists "academic requirement buckets are readable" on public.academic_requirement_buckets;
create policy "academic requirement buckets are readable"
on public.academic_requirement_buckets
for select
using (true);

drop policy if exists "academic course catalogs are readable" on public.academic_course_catalogs;
create policy "academic course catalogs are readable"
on public.academic_course_catalogs
for select
using (true);

drop policy if exists "academic courses are readable" on public.academic_courses;
create policy "academic courses are readable"
on public.academic_courses
for select
using (true);

drop policy if exists "academic schedule catalogs are readable" on public.academic_schedule_catalogs;
create policy "academic schedule catalogs are readable"
on public.academic_schedule_catalogs
for select
using (true);

drop policy if exists "academic term offerings are readable" on public.academic_term_offerings;
create policy "academic term offerings are readable"
on public.academic_term_offerings
for select
using (true);

drop policy if exists "academic course equivalencies are readable" on public.academic_course_equivalencies;
create policy "academic course equivalencies are readable"
on public.academic_course_equivalencies
for select
using (true);
