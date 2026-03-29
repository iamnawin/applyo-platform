-- Migration: Add automation tracking to applications

-- This migration adds columns to the `applications` table to track the state
-- of automated job application submissions.

-- `automation_status` can be one of:
--   - 'pending': The application is queued for submission by the automation engine.
--   - 'in_progress': The automation engine is currently processing this application.
--   - 'submitted': The application was successfully submitted to the external platform.
--   - 'failed': The automation engine failed to submit the application.
--   - 'manual': The application was submitted manually by the user.
--   - 'disabled': Automation is not enabled or applicable for this application.

ALTER TABLE public.applications
  ADD COLUMN automation_status TEXT NOT NULL DEFAULT 'disabled'
    CHECK (automation_status IN ('pending', 'in_progress', 'submitted', 'failed', 'manual', 'disabled')),
  ADD COLUMN automation_logs JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Create an index on the new status column for faster querying of the automation queue.
CREATE INDEX idx_applications_automation_status ON public.applications(automation_status);

-- For any applications that were already marked as 'applied', we can assume
-- they were handled manually before this system was in place.
UPDATE public.applications
SET automation_status = 'manual'
WHERE status = 'applied';
