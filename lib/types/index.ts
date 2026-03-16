import type { ParsedResume } from '@/lib/schemas/resume'
import type { NormalizedJob } from '@/lib/schemas/job'
export type { ParsedResume, NormalizedJob }
export type { MatchScore, ApprovalAction } from '@/lib/schemas/application'
export type { PreferenceInput as Preference } from '@/lib/schemas/preference'
export type { CandidateInput as Candidate } from '@/lib/schemas/candidate'
export type { CompanyInput as Company } from '@/lib/schemas/company'

export type ResumeProcessingStatus = 'ready' | 'pending_ai' | 'failed_ai'

// DB row types (extend as Supabase types are generated)
export interface Resume {
  id: string
  candidate_id: string
  storage_path: string
  parsed_data: ParsedResume
  embedding: number[] | null
  processing_status: ResumeProcessingStatus
  created_at: string
}

export interface Job {
  id: string
  company_id: string | null
  raw_description: string
  normalized_data: NormalizedJob
  embedding: number[] | null
  status: 'active' | 'closed'
  source: string
  source_url: string | null
  created_at: string
}

export interface Application {
  id: string
  candidate_id: string
  job_id: string
  match_score: number
  status: 'pending' | 'approved' | 'skipped' | 'applied' | 'rejected' | 'interview'
  applied_at: string | null
  created_at: string
}

// Placeholder — replace with generated Supabase types
export type Database = Record<string, unknown>
