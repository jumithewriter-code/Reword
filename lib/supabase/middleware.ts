import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/signup', '/pricing', '/auth']

/**
 * API routes authenticate themselves via requireUser() and answer with JSON.
 * Redirecting them to the HTML login page would hand fetch() a 200 page of
 * markup instead of a 401, which callers cannot act on.
 */
const isApiPath = (path: string) => path === '/api' || path.startsWith('/api/')

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  // Without credentials the app still runs; setup guidance is rendered in-app.
  if (!url || !key) return response

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'))

  if (!user && !isPublic && !isApiPath(path)) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/login'
    redirect.searchParams.set('next', path)
    return NextResponse.redirect(redirect)
  }

  if (user && (path === '/login' || path === '/signup')) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/studio'
    redirect.search = ''
    return NextResponse.redirect(redirect)
  }

  return response
}
