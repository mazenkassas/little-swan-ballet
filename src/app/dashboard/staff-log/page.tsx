import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { MapPin, Clock } from 'lucide-react'

export default async function StaffLogPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const today = params.date || format(new Date(), 'yyyy-MM-dd')

  const { data: logs } = await supabase
    .from('staff_attendance')
    .select('*, staff:staff(name, role)')
    .gte('login_time', today + 'T00:00:00')
    .lte('login_time', today + 'T23:59:59')
    .order('login_time', { ascending: false })

  return (
    <div className="p-8" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">سجل حضور الموظفين</h1>
          <p className="text-white/40 text-sm mt-1">متابعة دخول وخروج الموظفين</p>
        </div>
        <form>
          <input type="date" name="date" defaultValue={today}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/70 text-sm focus:outline-none focus:border-rose-500/60" />
        </form>
      </div>

      <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-right px-6 py-4 text-white/40 text-xs uppercase tracking-wider">الموظف</th>
              <th className="text-right px-4 py-4 text-white/40 text-xs uppercase tracking-wider">وقت الدخول</th>
              <th className="text-right px-4 py-4 text-white/40 text-xs uppercase tracking-wider">وقت الخروج</th>
              <th className="text-right px-4 py-4 text-white/40 text-xs uppercase tracking-wider">ساعات العمل</th>
              <th className="text-right px-4 py-4 text-white/40 text-xs uppercase tracking-wider">الموقع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {logs?.map((log: any) => (
              <tr key={log.id} className={`hover:bg-white/3 ${log.location_status === 'invalid' ? 'bg-amber-500/3' : ''}`}>
                <td className="px-6 py-4">
                  <p className="text-white text-sm font-medium">{log.staff?.name}</p>
                  <p className="text-white/30 text-xs">
                    {log.staff?.role === 'super_admin' ? 'مشرف عام' : log.staff?.role === 'admin' ? 'مدير' : 'موظف'}
                  </p>
                </td>
                <td className="px-4 py-4 text-white/60 text-sm">
                  {log.login_time ? new Date(log.login_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
                <td className="px-4 py-4 text-white/60 text-sm">
                  {log.logout_time ? new Date(log.logout_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : (
                    <span className="text-emerald-400 text-xs">جارٍ العمل</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {log.hours_on_shift ? (
                    <span className="text-violet-400 text-sm font-medium flex items-center gap-1">
                      <Clock size={13} />
                      {log.hours_on_shift.toFixed(1)} ساعة
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 w-fit ${
                    log.location_status === 'valid'
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : log.location_status === 'invalid'
                      ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                      : 'text-white/20 bg-white/5 border-white/10'
                  }`}>
                    <MapPin size={10} />
                    {log.location_status === 'valid' ? 'داخل الأكاديمية' : log.location_status === 'invalid' ? 'خارج النطاق' : 'غير محدد'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!logs || logs.length === 0) && (
          <div className="text-center py-16 text-white/20 text-sm">
            لا يوجد سجل لهذا اليوم
          </div>
        )}
      </div>
    </div>
  )
}
