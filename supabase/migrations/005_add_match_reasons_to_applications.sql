-- Migration: Add match_reasons to applications table

ALTER TABLE public.applications
  ADD COLUMN match_reasons JSONB NULL DEFAULT '[]'::jsonb;
