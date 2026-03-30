import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  // Refresh session if expired
  const { pathname } = request.nextUrl
  const protectedPrefixes = ['/dashboard', '/queue', '/preferences', '/matches']
  const authPages = ['/login', '/signup', '/']

  // Skip auth check for static assets and non-protected/non-auth pages to avoid middleware timeout
  const needsAuthCheck = protectedPrefixes.some(p => pathname.startsWith(p)) || authPages.includes(pathname)

  if (!needsAuthCheck) {
    return supabaseResponse
  }

  // Refresh session if expired and route actually needs it
  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes — redirect to login if not authed
  if (!user && protectedPrefixes.some(p => pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Already logged in — redirect away from auth pages and root
  if (user && authPages.includes(pathname)) {
    const role = user.user_metadata?.role
    const url = request.nextUrl.clone()
    url.pathname = role === 'company' ? '/dashboard/company' : '/dashboard/candidate'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
}
