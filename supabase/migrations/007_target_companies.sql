-- Migration to add a target_companies table for cron jobs
create table if not exists public.target_companies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  is_active boolean default true,
  last_scraped_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Basic RLS
alter table public.target_companies enable row level security;

-- Only service role can bypass RLS, or add specific policies later
create policy "Allow service role full access" 
  on public.target_companies
  using (true);
