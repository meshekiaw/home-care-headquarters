

# Expand Orientation from 8 Condensed Sections to 28 Individual Slides

## Summary

The PowerPoint has 28 slides, but the current `orientationContent.ts` condensed them into 8 sections. This plan expands the orientation to have one section per slide, preserving all original content exactly as presented.

## Slide-to-Section Mapping

Each of the 28 PowerPoint slides becomes its own orientation section (section 1–28), with the full content from that slide rendered as HTML. Slide 1 (title slide) and Slide 2 (roadmap) are included as sections too.

| Section | Slide Title |
|---------|------------|
| 1 | Employee Handbook Orientation (Title) |
| 2 | Training Roadmap / Orientation Overview |
| 3 | Purpose of the Handbook |
| 4 | Our Standard of Care and Professional Conduct |
| 5 | Selection, Hiring, and Non-Discrimination |
| 6 | Harassment, Complaints, and Grievances |
| 7 | Confidentiality and Client Privacy |
| 8 | Probation, Evaluations, and In-Service Education |
| 9 | Resignation, Termination, and Arbitration |
| 10 | Leave of Absence, Maternity, and Parental Leave |
| 11 | Sick Calls, Cancelled Visits, and Replacement Staff |
| 12 | Employee Health, Injury Reporting, and Appearance |
| 13 | Breaks, Gifts, Relationships, and No Smoking |
| 14 | Emergencies, Incidents, Compensation, and Payroll |
| 15 | Timesheets, Staffing Approval, and Reporting Requirements |
| 16 | Abuse, Neglect, and Substance Abuse Reporting |
| 17 | Emergency and Disaster Preparedness |
| 18 | Caregiver Role and Scope of Service |
| 19 | Examples of Allowed Caregiver Duties |
| 20 | Care Plan Expectations |
| 21 | Medication Policy: Strict Limits |
| 22 | Medication: Hand-over-Hand and OTC Limits |
| 23 | Documentation Rules |
| 24 | Background Checks and Employee Updates |
| 25 | Cell Phone Policy and Boundaries |
| 26 | EVV Overview: Why It Matters |
| 27 | EVV: If You Cannot Clock In or Out |
| 28 | Closing Acknowledgment |

## Changes

### 1. Rewrite `src/data/orientationContent.ts`
- Replace the existing 8 sections with 28 sections, one per slide
- Each section's `content` will be the full HTML from that slide (bullet points, sub-headers, emphasis)
- Quiz questions will be distributed across sections where they are topically relevant (roughly 1–2 questions per content section, none on the title/roadmap slides)
- Existing quiz questions will be preserved and redistributed; new questions added for slides that previously had no coverage

### 2. Update color theme array in `OrientationSection.tsx`
- The `SECTION_THEMES` array currently has 8 entries — it already uses modulo so it will cycle, but I'll expand it to cover more variety across 28 sections (add more color themes so fewer sections share the same color)

## Files Modified
- `src/data/orientationContent.ts` — full rewrite with 28 sections
- `src/components/orientation/OrientationSection.tsx` — expand color theme array

## Notes
- No database migration needed — the "Load Orientation Content" button in OrientationManagement seeds from this file
- Existing progress records in the database will need to be re-seeded (admin clicks "Load Orientation Content" again) since section numbers change
- The orientation viewer, quiz system, and progress tracking all work with dynamic section counts, so no other code changes are needed

