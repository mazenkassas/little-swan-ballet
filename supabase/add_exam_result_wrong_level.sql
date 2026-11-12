-- Exam results: add "Not this level" (ليست من هذا المستوى) for students listed under an exam
-- who actually belong to a higher or lower level. Safe to re-run.
ALTER TABLE public.student_exams DROP CONSTRAINT IF EXISTS student_exams_result_check;
ALTER TABLE public.student_exams ADD CONSTRAINT student_exams_result_check
  CHECK (result IN ('pass', 'fail', 'pending', 'evaluation', 'special_committee', 'transferred', 'wrong_level'));
