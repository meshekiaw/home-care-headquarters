

## Fix: Quiz Answers Exposed to Caregivers

### Problem
The `orientation_quizzes` table has a blanket SELECT policy (`USING (true)`) that lets any authenticated user — including caregivers — read all columns, including `correct_answer`. Caregivers can look up answers before taking quizzes.

### Solution
Since Supabase RLS operates at the row level (not column level), we cannot simply hide `correct_answer` via RLS. Instead:

1. **Create a database view** `orientation_quizzes_public` that exposes all columns **except** `correct_answer`.
2. **Create a server-side edge function** `check-quiz-answers` that accepts a caregiver's answers and returns results (pass/fail, score) — the correct answers never leave the server.
3. **Update the caregiver-facing code** (`CaregiverOrientation.tsx` / `OrientationQuiz`) to use the edge function for grading instead of client-side comparison.
4. **Drop the blanket caregiver SELECT policy** on `orientation_quizzes` so caregivers can no longer read `correct_answer`.
5. **Keep the admin policy** (`auth.uid() = user_id`) so admins can still manage quiz questions.

### Files changed

| File | Change |
|------|--------|
| Migration SQL | Create `orientation_quizzes_public` view (excludes `correct_answer`); drop the `Caregivers can view orientation quizzes` policy; add a new caregiver SELECT policy on the view |
| `supabase/functions/check-quiz-answers/index.ts` | New edge function: accepts `{ section_number, answers: Record<questionId, selectedOption> }`, grades server-side using service role, returns `{ score, passed, results }` |
| `src/hooks/useOrientation.ts` | `useOrientationQuizzes`: for non-admin users, query the view (no `correct_answer`); add a `gradeQuiz()` function that calls the edge function |
| `src/components/orientation/OrientationQuiz.tsx` | Remove client-side grading; call `gradeQuiz()` instead; show results from server response |
| `src/pages/CaregiverOrientation.tsx` | Pass the grading function through to the quiz component |

### How grading works after the fix

1. Caregiver selects answers and clicks Submit.
2. Frontend calls `check-quiz-answers` edge function with the caregiver's selections.
3. Edge function reads `correct_answer` from the DB (service role), computes score, returns pass/fail and per-question correctness.
4. Frontend displays results — correct answers are only revealed in the response after submission.

