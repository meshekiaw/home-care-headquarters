

# Inline Orientation Editing (Sections + Quizzes)

## Summary

You already have an Edit button on each section card that lets you change the title and HTML content. This plan enhances that experience by also letting you add new sections, manage quiz questions per section, and preview content — all without deleting or resyncing.

## Changes

### 1. Add "Add Section" capability
- Add an "Add Section" button to the top of the Sections tab in `OrientationManagement.tsx`
- Create `src/components/orientation/AddSectionDialog.tsx` with fields for section number, title, and content
- Uses the existing `addModule` hook function

### 2. Show and manage quiz questions per section
- Expand each section card to show its quiz questions in a collapsible list
- Add "Add Question" and "Delete" buttons per question
- Create `src/components/orientation/AddQuizQuestionDialog.tsx` with fields: question text, 4 options, correct answer selector, points
- Add `updateQuiz` function to `useOrientationQuizzes` hook for editing existing questions

### 3. Enhance EditSectionDialog with preview
- Add a "Preview" tab next to the HTML editor so you can see what the rendered content looks like before saving

### 4. Add edit capability for quiz questions
- Add an "Edit" button per quiz question that opens an inline editor or dialog
- Reuses the AddQuizQuestionDialog in edit mode

## Files
- `src/pages/OrientationManagement.tsx` — add "Add Section" button, expand section cards with quiz list
- `src/hooks/useOrientation.ts` — add `updateQuiz` function
- `src/components/orientation/EditSectionDialog.tsx` — add preview tab
- `src/components/orientation/AddSectionDialog.tsx` — new
- `src/components/orientation/AddQuizQuestionDialog.tsx` — new

## Notes
- No database changes needed — existing tables already support full CRUD
- Caregiver progress is preserved since section IDs don't change when editing

