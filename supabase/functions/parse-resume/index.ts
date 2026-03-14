import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Edge function: parse resume PDF text via OpenAI
serve(async (req) => {
  const { pdfText } = await req.json()
  // TODO: call OpenAI parse-resume logic
  return new Response(JSON.stringify({ error: 'Not implemented' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 501,
  })
})
