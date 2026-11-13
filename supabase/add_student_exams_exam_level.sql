-- Exam-only level (grade + term) for a student ("Not this level").
-- Does not change the student's own grade/term or class enrolment. Safe to re-run.
ALTER TABLE public.student_exams
  ADD COLUMN IF NOT EXISTS exam_grade_id uuid REFERENCES public.grades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS exam_term_id  uuid REFERENCES public.terms(id)  ON DELETE SET NULL;
