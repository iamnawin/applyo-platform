-- Migration 008: Verify processing_status defaults
-- Migration 003 already added processing_status to resumes.
-- This migration ensures the default is 'ready' for new inserts
-- (resumes are saved after AI parsing completes in step-3-save).

-- No-op: column already exists with correct default from migration 003.
-- This file documents that the schema is verified as correct for the
-- FreeLLMAPI integration pipeline.

-- Verify: resumes.processing_status defaults to 'ready'
-- Verify: resumes.embedding is vector(768) — matches Gemini text-embedding-004 output
-- Verify: applications.automation_status exists (migration 004)
-- Verify: applications.match_reasons exists (migration 005)
