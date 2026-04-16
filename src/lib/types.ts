// ============================================================
// LITTLE SWAN — Database Types (matches schema v3.0)
// ============================================================

export type StudentStatus = 'active' | 'frozen' | 'inactive'
export type AttendanceStatus = 'present' | 'absent' | 'make_up'
export type PaymentType = 'subscription' | 'product' | 'event' | 'private' | 'exam' | 'enrollment'
export type PaymentMethod = 'cash' | 'instapay'
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled'
export type TransferStatus = 'pending' | 'approved' | 'rejected'
export type ExamResult = 'pass' | 'fail' | 'pending'
export type LocationStatus = 'valid' | 'invalid' | 'pending'
export type ProductType = 'ready_stock' | 'made_to_order'
export type OrderStatus = 'pending' | 'in_production' | 'done' | 'delivered'
export type EventType = 'recital' | 'tv_show' | 'workshop' | 'competition'
export type StaffRole = 'super_admin' | 'admin' | 'staff'
export type SubscriptionStatus = 'active' | 'expired' | 'suspended'

export interface Level {
  id: string
  name: string
  order_num: number
  created_at: string
}

export interface Hall {
  id: string
  name: string
  capacity: number
  created_at: string
}

export interface Staff {
  id: string
  name: string
  email: string
  role: StaffRole
  is_active: boolean
  created_at: string
}

export interface Coach {
  id: string
  name_ar: string
  name_en: string
  phone: string | null
  email: string
  hourly_rate: number
  can_login: boolean
  is_active: boolean
  created_at: string
}

export interface Student {
  id: string
  name_ar: string
  name_en: string
  date_of_birth: string
  parent_phone: string
  level_id: string | null
  status: StudentStatus
  notes: string | null
  enrollment_date: string
  created_at: string
  updated_at: string
  // Joined
  level?: Level
  active_subscription?: Subscription
}

export interface Class {
  id: string
  name: string
  level_id: string | null
  age_group: string | null
  default_coach_id: string | null
  hall_id: string
  days_of_week: string[]
  start_time: string
  end_time: string
  max_capacity: number
  is_active: boolean
  created_at: string
  // Joined
  level?: Level
  hall?: Hall
  default_coach?: Coach
  enrolled_count?: number
}

export interface ClassStudent {
  id: string
  student_id: string
  class_id: string
  enrolled_date: string
  note: string | null
  student?: Student
  class?: Class
}

export interface Session {
  id: string
  class_id: string
  date: string
  coach_id: string | null
  staff_id: string | null
  hall_id: string
  status: SessionStatus
  created_at: string
  // Joined
  class?: Class
  coach?: Coach
  hall?: Hall
  attendance?: Attendance[]
}

export interface SubscriptionPlan {
  id: string
  name: string
  sessions_count: number
  price: number
  is_active: boolean
  created_at: string
}

export interface Subscription {
  id: string
  student_id: string
  plan_id: string | null
  total_sessions: number
  remaining_sessions: number
  start_date: string
  end_date: string | null
  status: SubscriptionStatus
  payment_id: string | null
  created_at: string
  plan?: SubscriptionPlan
}

export interface Payment {
  id: string
  student_id: string
  type: PaymentType
  amount_due: number
  amount_paid: number
  remaining_balance: number
  payment_method: PaymentMethod | null
  date: string
  staff_id: string | null
  notes: string | null
  created_at: string
  student?: Student
  staff?: Staff
}

export interface Attendance {
  id: string
  session_id: string
  student_id: string
  status: AttendanceStatus
  original_session_id: string | null
  recorded_by: string | null
  timestamp: string
  student?: Student
  session?: Session
}

export interface Freeze {
  id: string
  student_id: string
  start_date: string
  end_date: string | null
  reason: string | null
  status: 'active' | 'ended'
  created_by: string | null
  created_at: string
  student?: Student
}

export interface StudentTransfer {
  id: string
  student_id: string
  from_class_id: string
  to_class_id: string
  status: TransferStatus
  requested_by: string | null
  approved_by: string | null
  request_date: string
  decision_date: string | null
  notes: string | null
  student?: Student
  from_class?: Class
  to_class?: Class
}

export interface Exam {
  id: string
  name: string
  date: string
  fee: number
  level_id: string | null
  created_by: string | null
  created_at: string
  level?: Level
}

export interface StudentExam {
  id: string
  student_id: string
  exam_id: string
  result: ExamResult
  notes: string | null
  recorded_by: string | null
  promoted_to_level_id: string | null
  created_at: string
  student?: Student
  exam?: Exam
}

export interface CoachAttendance {
  id: string
  session_id: string | null
  coach_id: string
  check_in_time: string | null
  check_in_lat: number | null
  check_in_lng: number | null
  check_out_time: string | null
  check_out_lat: number | null
  check_out_lng: number | null
  location_status: LocationStatus
  hours_worked: number | null
  staff_validated: boolean
  notes: string | null
  created_at: string
  coach?: Coach
  session?: Session
}

export interface StaffAttendance {
  id: string
  staff_id: string
  login_time: string
  login_lat: number | null
  login_lng: number | null
  logout_time: string | null
  logout_lat: number | null
  logout_lng: number | null
  location_status: LocationStatus
  hours_on_shift: number | null
  notes: string | null
  staff?: Staff
}

export interface Product {
  id: string
  name: string
  type: ProductType
  size: string | null
  cost_price: number
  selling_price: number
  stock_qty: number
  is_active: boolean
  created_at: string
}

export interface ProductOrder {
  id: string
  student_id: string | null
  product_id: string | null
  size: string | null
  status: OrderStatus
  cost: number | null
  order_date: string
  notes: string | null
  created_at: string
  student?: Student
  product?: Product
}

export interface Event {
  id: string
  name: string
  type: EventType
  date: string
  venue: string | null
  price: number
  created_by: string | null
  created_at: string
  enrollments?: EventEnrollment[]
}

export interface EventEnrollment {
  id: string
  event_id: string
  student_id: string
  payment_status: 'paid' | 'partial' | 'unpaid'
  payment_id: string | null
  notes: string | null
  student?: Student
  event?: Event
}

export interface PrivateSession {
  id: string
  student_id: string
  coach_id: string
  date: string
  duration_hours: number
  fee: number
  payment_id: string | null
  notes: string | null
  created_at: string
  student?: Student
  coach?: Coach
}

export interface Expense {
  id: string
  title: string
  amount: number
  date: string
  staff_id: string | null
  notes: string | null
  created_at: string
}

export interface SystemSetting {
  key: string
  value: string
  description: string | null
  updated_by: string | null
  updated_at: string
}

// Dashboard types
export interface DashboardStats {
  total_students: number
  active_students: number
  frozen_students: number
  today_sessions: number
  today_revenue: number
  today_expenses: number
  pending_transfers: number
  payment_required_count: number
}
