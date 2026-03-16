import { createClient } from '@supabase/supabase-js'

function getSupabaseUrl() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  }
  return supabaseUrl
}

function getSupabaseAnonKey() {
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
  }
  return supabaseAnonKey
}

// Public client — use in client components with anon key
export function createPublicClient() {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey())
}

// Server-side client with service role (use only in API routes / server components)
// Replace with createClient<Database>() once Supabase types are generated via:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/types/database.ts
export function createServerClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createClient(getSupabaseUrl(), serviceKey, {
    auth: { persistSession: false },
  })
}
