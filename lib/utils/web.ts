/**
 * Fetches the HTML content of a URL.
 * In a production/Vercel environment, this uses standard fetch.
 */
export async function web_fetch({ prompt, url }: { prompt?: string; url?: string }): Promise<string> {
  const targetUrl = url || prompt?.match(/https?:\/\/[^\s]+/)?.[0]
  if (!targetUrl) throw new Error('No URL provided for web_fetch')

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return await response.text()
  } catch (error) {
    console.error(`web_fetch failed for ${targetUrl}:`, error)
    throw error
  }
}

/**
 * Searches the web using Google (or a mock for now).
 * Integrate a real search API (like Serper.dev or Google Custom Search) here.
 */
export async function google_web_search({ query }: { query: string }): Promise<any[]> {
  console.log(`Searching for: ${query}`)
  // TODO: Integrate Serper.dev or similar for real results.
  // For now, return an empty array or a mock to prevent build failure.
  return []
}
