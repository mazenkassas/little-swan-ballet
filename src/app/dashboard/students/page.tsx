import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Search, Filter } from 'lucide-react'
import { calculateAge, getStudentStatusColor } from '@/lib/utils'

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; level?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('students')
    .select('*, level:levels(id, name, order_num)')
    .order('enrollment_date', { ascending: false })

  if (params.status) query = query.eq('status', params.status)
  if (params.level) query = query.eq('level_id', params.level)
  if (params.search) {
    query = query.or(`name_ar.ilike.%${params.search}%,name_en.ilike.%${params.search}%,parent_phone.ilike.%${params.search}%`)
  }

  const { data: students } = await query
  const { data: levels } = await supabase.from('levels').select('*').order('order_num')

  const statusOptions = [
    { value: '', label: 'الكل' },
    { value: 'active', label: 'نشطة' },
    { value: 'frozen', label: 'مجمدة' },
    { value: 'inactive', label: 'غير نشطة' },
  ]

  return (
    <div className="p-8" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">الطالبات</h1>
          <p className="text-white/40 text-sm mt-1">{students?.length || 0} طالبة</p>
        </div>
        <Link
          href="/dashboard/students/new"
          className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-rose-500/25 text-sm"
        >
          <Plus size={18} />
          إضافة طالبة
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white/5 border border-white/8 rounded-2xl p-4 mb-6">
        <form className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              name="search"
              defaultValue={params.search}
              placeholder="بحث بالاسم أو رقم الهاتف..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pr-9 pl-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-rose-500/60 text-sm"
            />
          </div>
          <select
            name="status"
            defaultValue={params.status || ''}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/70 focus:outline-none text-sm min-w-32"
          >
            {statusOptions.map(o => (
              <option key={o.value} value={o.value} className="bg-[#1a1a2e]">{o.label}</option>
            ))}
          </select>
          <select
            name="level"
            defaultValue={params.level || ''}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/70 focus:outline-none text-sm min-w-40"
          >
            <option value="" className="bg-[#1a1a2e]">كل المستويات</option>
            {levels?.map(l => (
              <option key={l.id} value={l.id} className="bg-[#1a1a2e]">{l.name}</option>
            ))}
          </select>
          <button
            type="submit"
            className="flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/10 text-white/70 px-4 py-2.5 rounded-xl text-sm transition-colors"
          >
            <Filter size={15} />
            فلترة
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-right px-6 py-4 text-white/40 text-xs font-medium uppercase tracking-wider">الطالبة</th>
              <th className="text-right px-4 py-4 text-white/40 text-xs font-medium uppercase tracking-wider">العمر</th>
              <th className="text-right px-4 py-4 text-white/40 text-xs font-medium uppercase tracking-wider">المستوى</th>
              <th className="text-right px-4 py-4 text-white/40 text-xs font-medium uppercase tracking-wider">الحالة</th>
              <th className="text-right px-4 py-4 text-white/40 text-xs font-medium uppercase tracking-wider">الهاتف</th>
              <th className="text-right px-4 py-4 text-white/40 text-xs font-medium uppercase tracking-wider">تاريخ التسجيل</th>
              <th className="px-4 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {students?.map((student: any) => (
              <tr key={student.id} className="hover:bg-white/3 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {student.name_ar[0]}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{student.name_ar}</p>
                      <p className="text-white/30 text-xs">{student.name_en}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-white/60 text-sm">{calculateAge(student.date_of_birth)} سنة</span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-white/60 text-sm">{student.level?.name || '—'}</span>
                </td>
                <td className="px-4 py-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${getStudentStatusColor(student.status)}`}>
                    {student.status === 'active' ? 'نشطة' : student.status === 'frozen' ? 'مجمدة' : 'غير نشطة'}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-white/50 text-sm">{student.parent_phone}</span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-white/40 text-sm">
                    {new Date(student.enrollment_date).toLocaleDateString('ar-EG')}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <Link
                    href={`/dashboard/students/${student.id}`}
                    className="text-rose-400 hover:text-rose-300 text-xs font-medium transition-colors"
                  >
                    عرض
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!students || students.length === 0) && (
          <div className="text-center py-16 text-white/20">
            <p className="text-lg font-medium">لا توجد طالبات</p>
            <p className="text-sm mt-1">ابدأ بإضافة أول طالبة</p>
          </div>
        )}
      </div>
    </div>
  )
}
