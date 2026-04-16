-- ============================================================
-- LITTLE SWAN BALLET ACADEMY — Full Database Schema v3.0
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SECTION 1: CORE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  order_num INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS halls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'staff')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  phone TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  can_login BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  parent_phone TEXT NOT NULL,
  level_id UUID REFERENCES levels(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'inactive')),
  notes TEXT,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECTION 2: CLASSES & SESSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  level_id UUID REFERENCES levels(id),
  age_group TEXT,
  default_coach_id UUID REFERENCES coaches(id),
  hall_id UUID NOT NULL REFERENCES halls(id),
  days_of_week JSONB NOT NULL DEFAULT '[]',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  enrolled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  UNIQUE(student_id, class_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id),
  date DATE NOT NULL,
  coach_id UUID REFERENCES coaches(id),
  staff_id UUID REFERENCES staff(id),
  hall_id UUID NOT NULL REFERENCES halls(id),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECTION 3: ATTENDANCE & SUBSCRIPTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sessions_count INTEGER NOT NULL DEFAULT 4,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id),
  type TEXT NOT NULL CHECK (type IN ('subscription', 'product', 'event', 'private', 'exam', 'enrollment')),
  amount_due DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  remaining_balance DECIMAL(10,2) GENERATED ALWAYS AS (amount_due - amount_paid) STORED,
  payment_method TEXT CHECK (payment_method IN ('cash', 'instapay')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  staff_id UUID REFERENCES staff(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id),
  plan_id UUID REFERENCES subscription_plans(id),
  total_sessions INTEGER NOT NULL DEFAULT 4,
  remaining_sessions INTEGER NOT NULL DEFAULT 4,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended')),
  payment_id UUID REFERENCES payments(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  student_id UUID NOT NULL REFERENCES students(id),
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'make_up')),
  original_session_id UUID REFERENCES sessions(id),
  recorded_by UUID REFERENCES staff(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

CREATE TABLE IF NOT EXISTS freezes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id),
  start_date DATE NOT NULL,
  end_date DATE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECTION 4: TRANSFERS & EXAMS
-- ============================================================

CREATE TABLE IF NOT EXISTS student_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id),
  from_class_id UUID NOT NULL REFERENCES classes(id),
  to_class_id UUID NOT NULL REFERENCES classes(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by UUID REFERENCES staff(id),
  approved_by UUID REFERENCES staff(id),
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  decision_date DATE,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  level_id UUID REFERENCES levels(id),
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id),
  exam_id UUID NOT NULL REFERENCES exams(id),
  result TEXT DEFAULT 'pending' CHECK (result IN ('pass', 'fail', 'pending')),
  notes TEXT,
  recorded_by UUID REFERENCES staff(id),
  promoted_to_level_id UUID REFERENCES levels(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, exam_id)
);

-- ============================================================
-- SECTION 5: COACH ATTENDANCE & PAYROLL
-- ============================================================

CREATE TABLE IF NOT EXISTS coach_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id),
  coach_id UUID NOT NULL REFERENCES coaches(id),
  check_in_time TIMESTAMPTZ,
  check_in_lat DECIMAL(10,7),
  check_in_lng DECIMAL(10,7),
  check_out_time TIMESTAMPTZ,
  check_out_lat DECIMAL(10,7),
  check_out_lng DECIMAL(10,7),
  location_status TEXT DEFAULT 'pending' CHECK (location_status IN ('valid', 'invalid', 'pending')),
  hours_worked DECIMAL(5,2),
  staff_validated BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  login_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  login_lat DECIMAL(10,7),
  login_lng DECIMAL(10,7),
  logout_time TIMESTAMPTZ,
  logout_lat DECIMAL(10,7),
  logout_lng DECIMAL(10,7),
  location_status TEXT DEFAULT 'pending' CHECK (location_status IN ('valid', 'invalid', 'pending')),
  hours_on_shift DECIMAL(5,2),
  notes TEXT
);

-- ============================================================
-- SECTION 6: INVENTORY, EVENTS & PRIVATE SESSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ready_stock', 'made_to_order')),
  size TEXT,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id),
  product_id UUID REFERENCES products(id),
  size TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_production', 'done', 'delivered')),
  cost DECIMAL(10,2),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('recital', 'tv_show', 'workshop', 'competition')),
  date DATE NOT NULL,
  venue TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id),
  student_id UUID NOT NULL REFERENCES students(id),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
  payment_id UUID REFERENCES payments(id),
  notes TEXT,
  UNIQUE(event_id, student_id)
);

CREATE TABLE IF NOT EXISTS private_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id),
  coach_id UUID NOT NULL REFERENCES coaches(id),
  date DATE NOT NULL,
  duration_hours DECIMAL(4,2) NOT NULL DEFAULT 1.0,
  fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_id UUID REFERENCES payments(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  staff_id UUID REFERENCES staff(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECTION 7: SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES staff(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEFAULT DATA
-- ============================================================

INSERT INTO halls (name, capacity) VALUES
  ('Hall 1', 20),
  ('Hall 2', 20)
ON CONFLICT DO NOTHING;

INSERT INTO levels (name, order_num) VALUES
  ('Pre-Ballet 1', 1),
  ('Pre-Ballet 2', 2),
  ('Grade 1', 3),
  ('Grade 2', 4),
  ('Grade 3', 5),
  ('Grade 4', 6)
ON CONFLICT DO NOTHING;

INSERT INTO subscription_plans (name, sessions_count, price) VALUES
  ('Standard Plan (4 sessions)', 4, 500.00)
ON CONFLICT DO NOTHING;

INSERT INTO system_settings (key, value, description) VALUES
  ('max_freeze_days', '30', 'Maximum freeze days allowed per month'),
  ('absence_hide_threshold', '5', 'Consecutive absences before auto-inactive'),
  ('academy_lat', '25.7617', 'Academy GPS latitude'),
  ('academy_lng', '-80.1918', 'Academy GPS longitude'),
  ('allowed_radius_meters', '100', 'GPS validation radius in meters'),
  ('academy_name', 'Little Swan Ballet Academy', 'Academy display name'),
  ('branch_name', 'Miami Branch', 'Branch name')
ON CONFLICT DO NOTHING;

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_level ON students(level_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_class ON sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_student ON subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_coach_attendance_coach ON coach_attendance(coach_id);

-- ============================================================
-- ROW LEVEL SECURITY (Enable for production)
-- ============================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (customize per role in production)
CREATE POLICY "Allow authenticated" ON students FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated" ON payments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated" ON attendance FOR ALL USING (auth.role() = 'authenticated');
