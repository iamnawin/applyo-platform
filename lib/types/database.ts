// Typed Database schema — replace with Supabase CLI generated types once project is linked
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/types/database.ts

export interface Database {
  public: {
    Tables: {
      candidates: {
        Row: {
          id: string
          user_id: string
          full_name: string
          email: string
          phone: string | null
          location: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['candidates']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['candidates']['Insert']>
      }
      resumes: {
        Row: {
          id: string
          candidate_id: string
          storage_path: string
          parsed_data: Record<string, unknown>
          embedding: number[] | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['resumes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['resumes']['Insert']>
      }
      companies: {
        Row: {
          id: string
          user_id: string
          name: string
          website: string | null
          industry: string | null
          size: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['companies']['Insert']>
      }
      jobs: {
        Row: {
          id: string
          company_id: string | null
          raw_description: string
          normalized_data: Record<string, unknown>
          embedding: number[] | null
          status: 'active' | 'closed'
          source: string
          source_url: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['jobs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['jobs']['Insert']>
      }
      preferences: {
        Row: {
          id: string
          candidate_id: string
          desired_roles: string[]
          preferred_locations: string[]
          job_types: string[]
          min_salary: number | null
          max_applications_per_day: number
          blacklisted_companies: string[]
          notify_on_match: boolean
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['preferences']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['preferences']['Insert']>
      }
      applications: {
        Row: {
          id: string
          candidate_id: string
          job_id: string
          match_score: number
          status: 'pending' | 'approved' | 'skipped' | 'applied' | 'rejected' | 'interview'
          applied_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['applications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['applications']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
