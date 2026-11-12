-- Clock-in / clock-out for admin & staff (login = clock in, logout = clock out).
-- Each person has their own shift; presence is tracked with a heartbeat (last_seen).

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS shift_start TIME,
  ADD COLUMN IF NOT EXISTS shift_end   TIME,
  -- Days of week the person works: 0 = Sunday … 6 = Saturday (default: all but Friday)
  ADD COLUMN IF NOT EXISTS work_days   SMALLINT[] DEFAULT '{0,1,2,3,4,6}';

ALTER TABLE staff_attendance
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS staff_attendance_staff_login_idx
  ON staff_attendance (staff_id, login_time DESC);

-- At most one open (not clocked-out) session per person.
CREATE UNIQUE INDEX IF NOT EXISTS staff_attendance_one_open_idx
  ON staff_attendance (staff_id) WHERE logout_time IS NULL;
