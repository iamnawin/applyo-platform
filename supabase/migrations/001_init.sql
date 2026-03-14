-- Enable pgvector
create extension if not exists vector;

-- Candidates
create table candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  full_name text not null,
  email text not null,
  phone text,
  location text,
  created_at timestamptz default now() not null
);

-- Resumes
create table resumes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade not null,
  storage_path text not null,
  parsed_data jsonb not null default '{}',
  embedding vector(1536),
  created_at timestamptz default now() not null
);

-- Companies
create table companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  name text not null,
  website text,
  industry text,
  size text,
  created_at timestamptz default now() not null
);

-- Jobs
create table jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete set null,
  raw_description text not null,
  normalized_data jsonb not null default '{}',
  embedding vector(1536),
  status text not null default 'active' check (status in ('active', 'closed')),
  source text not null,
  source_url text,
  created_at timestamptz default now() not null
);

-- Preferences
create table preferences (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade not null unique,
  desired_roles text[] default '{}',
  preferred_locations text[] default '{}',
  job_types text[] default '{}',
  min_salary numeric,
  max_applications_per_day integer default 10,
  blacklisted_companies text[] default '{}',
  notify_on_match boolean default true,
  updated_at timestamptz default now() not null
);

-- Applications
create table applications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade not null,
  job_id uuid references jobs(id) on delete cascade not null,
  match_score numeric not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'skipped', 'applied', 'rejected', 'interview')),
  applied_at timestamptz,
  created_at timestamptz default now() not null,
  unique (candidate_id, job_id)
);
