'use server'
// Clock-in / clock-out for admin & staff.
// The dashboard calls clockPing() when it opens and every few minutes while open;
// logging out calls clockOut(). A session that stops pinging is closed at its last_seen.
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hoursBetween, isLive, sessionEnd } from '@/lib/staffClock'

type Admin = ReturnType<typeof createAdminClient>

/** The signed-in admin/staff member, or null for anyone else (super admins aren't tracked). */
async function trackedStaffId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  const email = user.email.trim().replace(/[\\%_]/g, '\\$&')
  const { data: me } = await createAdminClient()
    .from('staff')
    .select('id, role, is_active')
    .ilike('email', email)
    .maybeSingle()
  if (!me || me.is_active === false) return null
  return me.role === 'admin' || me.role === 'staff' ? me.id : null
}

async function closeSession(admin: Admin, s: { id: string; login_time: string }, endMs: number) {
  await admin.from('staff_attendance').update({
    logout_time: new Date(endMs).toISOString(),
    last_seen: new Date(endMs).toISOString(),
    hours_on_shift: hoursBetween(new Date(s.login_time).getTime(), endMs),
  }).eq('id', s.id).is('logout_time', null)
}

/** Clock in (if not already) and record that the person is still here. */
export async function clockPing(): Promise<void> {
  const staffId = await trackedStaffId()
  if (!staffId) return
  const admin = createAdminClient()
  const now = Date.now()

  const { data: open } = await admin
    .from('staff_attendance')
    .select('id, login_time, logout_time, last_seen')
    .eq('staff_id', staffId)
    .is('logout_time', null)
    .maybeSingle()

  if (open && isLive(open, now)) {
    await admin.from('staff_attendance')
      .update({ last_seen: new Date(now).toISOString() }).eq('id', open.id)
    return
  }

  // Went quiet (closed the browser without logging out): clock out at last activity.
  if (open) await closeSession(admin, open, sessionEnd(open, now))

  // Clock in. The one-open-session index makes a racing second tab's insert fail harmlessly.
  const stamp = new Date(now).toISOString()
  await admin.from('staff_attendance').insert({
    staff_id: staffId, login_time: stamp, last_seen: stamp,
  })
}

/** Clock out now (called on logout). */
export async function clockOut(): Promise<void> {
  const staffId = await trackedStaffId()
  if (!staffId) return
  const admin = createAdminClient()
  const now = Date.now()
  const { data: open } = await admin
    .from('staff_attendance')
    .select('id, login_time, logout_time, last_seen')
    .eq('staff_id', staffId)
    .is('logout_time', null)
    .maybeSingle()
  if (open) await closeSession(admin, open, isLive(open, now) ? now : sessionEnd(open, now))
}
