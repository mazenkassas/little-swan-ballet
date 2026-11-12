-- Location + device for clock-ins (admin/staff) and check-ins (coaches).
-- device: 'mobile' (phone/tablet browser) or 'desktop' (computer browser = "Website").
-- location_status gains 'denied' = the person blocked location access.

ALTER TABLE staff_attendance
  ADD COLUMN IF NOT EXISTS login_device     TEXT,
  ADD COLUMN IF NOT EXISTS login_distance_m INTEGER;

ALTER TABLE coach_attendance
  ADD COLUMN IF NOT EXISTS check_in_device     TEXT,
  ADD COLUMN IF NOT EXISTS check_in_distance_m INTEGER;

ALTER TABLE staff_attendance DROP CONSTRAINT IF EXISTS staff_attendance_location_status_check;
ALTER TABLE staff_attendance ADD CONSTRAINT staff_attendance_location_status_check
  CHECK (location_status IN ('valid', 'invalid', 'pending', 'denied'));

ALTER TABLE coach_attendance DROP CONSTRAINT IF EXISTS coach_attendance_location_status_check;
ALTER TABLE coach_attendance ADD CONSTRAINT coach_attendance_location_status_check
  CHECK (location_status IN ('valid', 'invalid', 'pending', 'denied'));
