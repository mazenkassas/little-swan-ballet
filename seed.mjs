import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GRADE_NAMES = [
  'PreBallet 1',
  'PreBallet 2',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
]

// 14 levels: each grade × 2 terms
const NEW_LEVELS = GRADE_NAMES.flatMap(g => [
  { name: `${g} Term 1` },
  { name: `${g} Term 2` },
])

// ── Levels ────────────────────────────────────────────────────
console.log('── Levels ──')
const { data: existing } = await supabase.from('levels').select('name, order_num').order('order_num')
const existingNames = new Set((existing || []).map(l => l.name))
const maxOrder = Math.max(0, ...(existing || []).map(l => l.order_num || 0))

const toInsert = NEW_LEVELS
  .filter(l => !existingNames.has(l.name))
  .map((l, i) => ({ ...l, order_num: maxOrder + i + 1 }))

if (toInsert.length === 0) {
  console.log('✅ All levels already exist — skipped')
} else {
  const { error } = await supabase.from('levels').insert(toInsert)
  if (error) {
    console.error('❌ Levels insert error:', error.message)
  } else {
    console.log(`✅ Inserted ${toInsert.length} levels:`)
    toInsert.forEach(l => console.log(`   • [${l.order_num}] ${l.name}`))
  }
}

// ── Grades ────────────────────────────────────────────────────
console.log('\n── Grades ──')
const { data: gradeTest, error: gradeCheckErr } = await supabase.from('grades').select('name').limit(1)

if (gradeCheckErr) {
  console.log('⚠️  The "grades" table does not exist yet.')
  console.log('    Go to: https://supabase.com/dashboard/project/zldwubzeodkilzzzguuq/sql/new')
  console.log('    Run this SQL:\n')
  console.log(`-- Create grades table
CREATE TABLE IF NOT EXISTS public.grades (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  order_num  integer,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON public.grades FOR ALL USING (true) WITH CHECK (true);

-- Insert grades
INSERT INTO public.grades (name, order_num) VALUES
  ('PreBallet 1', 1),
  ('PreBallet 2', 2),
  ('Grade 1',     3),
  ('Grade 2',     4),
  ('Grade 3',     5),
  ('Grade 4',     6),
  ('Grade 5',     7)
ON CONFLICT (name) DO NOTHING;`)
  console.log('')
} else {
  const existingGradeNames = new Set((gradeTest || []).map((g) => g.name))
  const { data: allGrades } = await supabase.from('grades').select('name')
  const existingAll = new Set((allGrades || []).map(g => g.name))
  const gradesToInsert = GRADE_NAMES
    .map((name, i) => ({ name, order_num: i + 1 }))
    .filter(g => !existingAll.has(g.name))

  if (gradesToInsert.length === 0) {
    console.log('✅ All grades already exist — skipped')
  } else {
    const { error } = await supabase.from('grades').insert(gradesToInsert)
    if (error) console.error('❌ Grades insert error:', error.message)
    else console.log(`✅ Inserted ${gradesToInsert.length} grade(s):`, gradesToInsert.map(g => g.name).join(', '))
  }
}
