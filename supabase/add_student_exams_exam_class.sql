-- Exam-only class for a student ("Not this level"): the class she sits this exam with.
-- Does not change her real enrolment in class_students. Safe to re-run.
ALTER TABLE public.student_exams ADD COLUMN IF NOT EXISTS exam_class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;
