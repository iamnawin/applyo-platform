import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Edge function: score candidate-job match
serve(async (req) => {
  const { resumeId, jobId } = await req.json()
  return new Response(JSON.stringify({ error: 'Not implemented' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 501,
  })
})
