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
    const email = (user.email ?? '').trim().replace(/[\\%_]/g, '\\$&')
    const { data: staffData } = await supabase
      .from('staff')
      .select('role, is_active')
      .ilike('email', email)
      .maybeSingle()

    // Not an active staff member → no dashboard access.
    if (!staffData || staffData.is_active === false) {
      const { data: coach } = await supabase
        .from('coaches')
        .select('id')
        .ilike('email', email)
        .eq('can_login', true)
        .eq('is_active', true)
        .maybeSingle()
      if (coach) return NextResponse.redirect(new URL('/coach', request.url))

      // Unknown or deactivated account: sign out (keeping the cleared cookies) and go to login
      await supabase.auth.signOut()
      const res = NextResponse.redirect(new URL('/login', request.url))
      supabaseResponse.cookies.getAll().forEach(c => res.cookies.set(c))
      return res
    }

    const role = staffData.role

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

      // Access follows the "View" toggle on the Roles page
      // (stored as JSON in system_settings.role_permissions).
      // The Subscriptions page checks the Roles-page permissions itself.
      if (page && page !== '' && page !== 'subscriptions') {
        const { data: setting } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'role_permissions')
          .maybeSingle()

        let canView = false
        try { canView = !!JSON.parse(setting?.value || '{}')?.[role]?.[page]?.view } catch {}

        if (!canView) {
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