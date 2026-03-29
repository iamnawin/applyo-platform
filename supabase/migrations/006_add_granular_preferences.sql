-- Migration: Add granular preferences to preferences table

ALTER TABLE public.preferences
  ADD COLUMN target_companies JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN preferred_industries JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN work_authorization TEXT,
  ADD COLUMN desired_salary_currency TEXT,
  ADD COLUMN desired_job_titles JSONB NOT NULL DEFAULT '[]'::jsonb;
