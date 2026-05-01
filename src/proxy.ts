import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname === '/login'
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')

  if (!user && isDashboard) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (user && isDashboard) {
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('role')
      .eq('email', user.email)
      .single()

    const role = staffData?.role

    console.log('=== PROXY DEBUG ===')
    console.log('USER EMAIL:', user.email)
    console.log('ROLE FROM DB:', role)
    console.log('STAFF ERROR:', staffError)
    console.log('PATH:', request.nextUrl.pathname)
    console.log('===================')

    if (role === 'super_admin') return supabaseResponse

    if (role === 'coach') {
      const isCoachPage = request.nextUrl.pathname.startsWith('/dashboard/coaches/checkin')
      if (!isCoachPage) {
        return NextResponse.redirect(new URL('/dashboard/coaches/checkin', request.url))
      }
      return supabaseResponse
    }

    if (role === 'admin' || role === 'staff') {
      const pathParts = request.nextUrl.pathname.split('/')
      const page = pathParts[2]

      console.log('PAGE EXTRACTED:', page)

      if (page && page !== '') {
        const { data: permission, error: permError } = await supabase
          .from('role_permissions')
          .select('id')
          .eq('role', role)
          .eq('page', page)
          .single()

        console.log('PERMISSION:', permission)
        console.log('PERM ERROR:', permError)

        if (!permission) {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}