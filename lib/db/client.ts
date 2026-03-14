import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Public client — use in client components with anon key
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role (use only in API routes / server components)
// Replace with createClient<Database>() once Supabase types are generated via:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/types/database.ts
export function createServerClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })
}
