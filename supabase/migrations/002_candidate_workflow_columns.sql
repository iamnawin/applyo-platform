alter table preferences
  add column if not exists target_companies text[] default '{}',
  add column if not exists preferred_industries text[] default '{}',
  add column if not exists work_authorization text,
  add column if not exists desired_salary_currency text,
  add column if not exists desired_job_titles text[] default '{}';

alter table applications
  add column if not exists match_reasons text[],
  add column if not exists automation_status text default 'pending',
  add column if not exists automation_logs jsonb default '[]'::jsonb;
