import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Optimized cookie handling for better performance
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

  const { pathname } = request.nextUrl
  const protectedPrefixes = ['/dashboard', '/queue', '/preferences', '/matches']
  const authPages = ['/login', '/signup'] // Removed root '/' to prevent timeouts on landing page

  // 1. Skip expensive logic for static assets and non-sensitive routes
  const isProtected = protectedPrefixes.some(p => pathname.startsWith(p))
  const isAuthPage = authPages.includes(pathname)

  if (!isProtected && !isAuthPage) {
    return supabaseResponse
  }

  // 2. Performance Guard: Only call getUser() if an auth cookie actually exists
  // This prevents anonymous users from triggering a slow remote call on every visit.
  const hasAuthCookie = request.cookies.getAll().some(c => c.name.startsWith('sb-'))
  if (!hasAuthCookie && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (hasAuthCookie) {
    const { data: { user } } = await supabase.auth.getUser()

    // Protected routes — redirect to login if not authed
    if (!user && isProtected) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Already logged in — redirect away from auth pages
    if (user && isAuthPage) {
      const role = user.user_metadata?.role
      const url = request.nextUrl.clone()
      url.pathname = role === 'company' ? '/dashboard/company' : '/dashboard/candidate'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
}
