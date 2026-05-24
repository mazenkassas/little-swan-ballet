'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Search, Users } from 'lucide-react'
import { addHoliday } from './actions'

type Student = { id: string; name_ar: string; name_en: string | null }

export default function HolidayForm({ isRtl, students }: { isRtl: boolean; students: Student[] }) {
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [startDate,   setStartDate]   = useState('')
  const [endDate,     setEndDate]     = useState('')
  const [dateErr,     setDateErr]     = useState('')
  const [nameVal,     setNameVal]     = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search,      setSearch]      = useState('')
  const [dropOpen,    setDropOpen]    = useState(false)
  const [dropRect,    setDropRect]    = useState<{ top: number; left: number; width: number } | null>(null)
  const [mounted,     setMounted]     = useState(false)
  const [today,       setToday]       = useState('')

  const anchorRef  = useRef<HTMLDivElement>(null)   // search input wrapper
  const dropListRef = useRef<HTMLDivElement>(null)  // portaled dropdown list

  useEffect(() => {
    setMounted(true)
    setToday(new Date().toISOString().split('T')[0])
  }, [])

  const updateRect = useCallback(() => {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect()
      setDropRect({ top: r.bottom + 4, left: r.left, width: r.width })
    }
  }, [])

  // Close on outside click (must check both anchor and dropdown list)
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node
      if (
        !anchorRef.current?.contains(target) &&
        !dropListRef.current?.contains(target)
      ) {
        setDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Reposition on scroll or resize while open
  useEffect(() => {
    if (!dropOpen) return
    const onReposition = () => updateRect()
    window.addEventListener('scroll', onReposition, true)
    window.addEventListener('resize', onReposition)
    return () => {
      window.removeEventListener('scroll', onReposition, true)
      window.removeEventListener('resize', onReposition)
    }
  }, [dropOpen, updateRect])

  function openDropdown() {
    updateRect()
    setDropOpen(true)
  }

  function validateDates(start: string, end: string) {
    if (!start || !end) { setDateErr(''); return true }
    if (end < start) {
      setDateErr(isRtl ? 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' : 'End date must be on or after start date')
      return false
    }
    setDateErr('')
    return true
  }

  function handleStartChange(v: string) {
    setStartDate(v)
    validateDates(v, endDate)
    if (!endDate || endDate < v) setEndDate(v)
  }

  function handleEndChange(v: string) {
    setEndDate(v)
    validateDates(startDate, v)
  }

  function toggleStudent(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function removeStudent(id: string) {
    setSelectedIds(prev => prev.filter(x => x !== id))
  }

  const filtered = students.filter(s => {
    if (selectedIds.includes(s.id)) return false
    const q = search.toLowerCase()
    return !q || (s.name_ar || '').includes(search) || (s.name_en || '').toLowerCase().includes(q)
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!validateDates(startDate, endDate)) return
    if (!nameVal.trim()) { setError(isRtl ? 'الاسم مطلوب' : 'Name is required'); return }
    setSaving(true)
    const res = await addHoliday({
      name: nameVal.trim(),
      start_date: startDate,
      end_date: endDate,
      student_ids: selectedIds.length > 0 ? selectedIds : null,
    })
    setSaving(false)
    if (res?.error) { setError(res.error); return }
    setNameVal('')
    setStartDate('')
    setEndDate('')
    setDateErr('')
    setSelectedIds([])
    setSearch('')
    setDropOpen(false)
  }

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--txt2)', marginBottom: 5,
  }
  function inp(hasErr = false): React.CSSProperties {
    return {
      width: '100%', padding: '9px 12px', borderRadius: 8,
      border: `1px solid ${hasErr ? '#e04040' : 'var(--border)'}`,
      background: 'var(--bg-page)', color: 'var(--txt1)', fontSize: 13,
      outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
      direction: isRtl ? 'rtl' : 'ltr',
    }
  }

  const selectedStudents = students.filter(s => selectedIds.includes(s.id))
  const startInvalid  = !!startDate && !!endDate && endDate < startDate
  const endInvalid    = startInvalid
  const isAllStudents = selectedIds.length === 0
  const saveDisabled  = saving || !!dateErr || !startDate || !endDate

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20,
    }}>
      <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--txt1)' }}>
        {isRtl ? 'إضافة إجازة جديدة' : 'Add New Holiday'}
      </p>

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Name */}
        <div>
          <label style={lbl}>
            {isRtl ? 'الاسم' : 'Name'} <span style={{ color: '#e04040' }}>*</span>
          </label>
          <input
            required value={nameVal} onChange={e => setNameVal(e.target.value)}
            placeholder={isRtl ? 'مثال: إجازة العيد' : 'e.g. Eid Holiday'}
            style={inp(!nameVal.trim() && !!error)}
          />
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>
              {isRtl ? 'تاريخ البداية' : 'Start Date'} <span style={{ color: '#e04040' }}>*</span>
            </label>
            <input
              type="date" required value={startDate} min={today}
              onChange={e => handleStartChange(e.target.value)}
              style={inp(startInvalid)}
              suppressHydrationWarning
            />
          </div>
          <div>
            <label style={lbl}>
              {isRtl ? 'تاريخ النهاية' : 'End Date'} <span style={{ color: '#e04040' }}>*</span>
            </label>
            <input
              type="date" required value={endDate} min={startDate || today}
              onChange={e => handleEndChange(e.target.value)}
              style={inp(endInvalid)}
              suppressHydrationWarning
            />
          </div>
        </div>

        {/* Duration hint */}
        {startDate && endDate && !dateErr && (
          <p style={{ margin: '-4px 0 0', fontSize: 11, color: '#4a90d9', fontWeight: 600 }}>
            📅 {(() => {
              const days = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1
              return isRtl ? `${days} ${days === 1 ? 'يوم' : 'أيام'}` : `${days} ${days === 1 ? 'day' : 'days'}`
            })()}
          </p>
        )}

        {dateErr && <p style={{ margin: '-4px 0 0', fontSize: 12, color: '#e04040', fontWeight: 600 }}>⚠ {dateErr}</p>}

        {/* Students multi-select */}
        <div>
          <label style={lbl}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Users size={12} />
              {isRtl ? 'الطالبات' : 'Students'}
            </span>
          </label>

          {/* Scope badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, marginBottom: 8,
            background: isAllStudents ? '#7c5cdb18' : '#d4667a18',
            color:      isAllStudents ? '#7c5cdb'   : '#d4667a',
            border:     `1px solid ${isAllStudents ? '#7c5cdb30' : '#d4667a30'}`,
          }}>
            {isAllStudents
              ? (isRtl ? '🌍 لجميع الطالبات' : '🌍 All students (academy-wide)')
              : (isRtl ? `👤 ${selectedIds.length} طالبة فقط` : `👤 ${selectedIds.length} specific student(s)`)}
          </div>

          {/* Selected chips */}
          {selectedStudents.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {selectedStudents.map(s => (
                <span key={s.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: '#d4667a18', color: '#d4667a', border: '1px solid #d4667a30',
                  borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600,
                }}>
                  {isRtl || !s.name_en ? s.name_ar : s.name_en}
                  <button
                    type="button" onClick={() => removeStudent(s.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#d4667a', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                style={{ fontSize: 11, color: 'var(--txt2)', background: 'none', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {isRtl ? 'مسح الكل' : 'Clear all'}
              </button>
            </div>
          )}

          {/* Search anchor — used for positioning the portaled dropdown */}
          <div ref={anchorRef}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              border: `1px solid ${dropOpen ? '#7c5cdb' : 'var(--border)'}`,
              borderRadius: 8, padding: '8px 12px', background: 'var(--bg-page)',
              transition: 'border-color 0.15s',
            }}>
              <Search size={13} style={{ color: 'var(--txt2)', flexShrink: 0 }} />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); openDropdown() }}
                onFocus={openDropdown}
                placeholder={isRtl ? 'ابحثي عن طالبة…' : 'Search student…'}
                style={{
                  border: 'none', outline: 'none', background: 'transparent',
                  color: 'var(--txt1)', fontSize: 12, flex: 1, fontFamily: 'inherit',
                  direction: isRtl ? 'rtl' : 'ltr',
                }}
              />
              {dropOpen && (
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); setDropOpen(false); setSearch('') }}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--txt2)', display: 'flex', alignItems: 'center' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <p style={{ margin: '5px 0 0', fontSize: 11, color: 'var(--txt2)' }}>
            {isRtl
              ? 'اتركي الحقل فارغاً لتطبيق الإجازة على جميع الطالبات'
              : 'Leave empty to apply to all students (academy-wide)'}
          </p>
        </div>

        {error && <p style={{ margin: 0, fontSize: 12, color: '#e04040', fontWeight: 600 }}>⚠ {error}</p>}

        <button
          type="submit"
          disabled={saveDisabled}
          style={{
            background: '#d4667a', border: 'none', borderRadius: 10,
            padding: '10px 0', color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: saveDisabled ? 'not-allowed' : 'pointer',
            opacity: saveDisabled ? 0.5 : 1,
            fontFamily: 'inherit',
          }}
        >
          {saving ? (isRtl ? 'جارٍ الحفظ…' : 'Saving…') : (isRtl ? 'حفظ الإجازة' : 'Save Holiday')}
        </button>
      </form>

      {/* Portaled dropdown — rendered in #portal-root to escape all stacking contexts */}
      {mounted && dropOpen && dropRect && createPortal(
        <div
          ref={dropListRef}
          style={{
            position: 'fixed',
            top: dropRect.top,
            left: dropRect.left,
            width: dropRect.width,
            zIndex: 9999,
            background: 'var(--bg-popup)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            maxHeight: 220,
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          }}
        >
          {filtered.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '16px 0', color: 'var(--txt2)', fontSize: 12, margin: 0 }}>
              {isRtl ? 'لا توجد نتائج' : 'No results'}
            </p>
          ) : filtered.map(s => (
            <div
              key={s.id}
              onMouseDown={e => {
                e.preventDefault()
                toggleStudent(s.id)
                setSearch('')
              }}
              style={{
                padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                color: 'var(--txt1)', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              className="hover:opacity-75"
            >
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: '#d4667a18', color: '#d4667a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {(s.name_ar || '').charAt(0)}
              </div>
              {isRtl || !s.name_en ? s.name_ar : s.name_en}
            </div>
          ))}
        </div>,
        document.getElementById('portal-root') ?? document.body
      )}
    </div>
  )
}
