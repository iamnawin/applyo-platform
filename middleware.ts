import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const { pathname } = request.nextUrl
  
  // 1. PERFORMANCE GUARD: Immediately skip middleware for all static assets and public pages
  // This prevents the 50ms Edge limit from blocking JS chunks or the Landing Page.
  const isStatic = pathname.startsWith('/_next') || pathname.includes('favicon.ico') || pathname.includes('.')
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/signup'
  
  if (isStatic || isPublicPage) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options as any)
          })
        },
      },
    }
  )

  // 2. PROTECTED ROUTE GUARD: Only run auth check for sensitive paths
  const protectedPrefixes = ['/dashboard', '/queue', '/preferences', '/matches', '/api/protected']
  const isProtected = protectedPrefixes.some(p => pathname.startsWith(p))

  if (isProtected) {
    // Only call getUser if we have a cookie, to avoid unnecessary remote calls
    const hasAuthCookie = request.cookies.getAll().some(c => c.name.startsWith('sb-'))
    if (!hasAuthCookie) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
