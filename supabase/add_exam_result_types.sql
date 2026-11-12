-- Exam results: add Evaluation (تقييم), Special Committee (لجنة خاصة) and Transferred (منقول).
-- Existing results (pass / fail / pending) are unchanged. Safe to re-run.
ALTER TABLE public.student_exams DROP CONSTRAINT IF EXISTS student_exams_result_check;
ALTER TABLE public.student_exams ADD CONSTRAINT student_exams_result_check
  CHECK (result IN ('pass', 'fail', 'pending', 'evaluation', 'special_committee', 'transferred'));
