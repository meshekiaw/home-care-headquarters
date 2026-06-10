
## AI Call-Off Manager + EVV Exception Log

Add two new tabs to the Scheduling page powered by Lovable AI Gateway (using `google/gemini-2.5-pro` — equivalent to Claude Sonnet 4 for reasoning, no extra API key needed and included in your plan).

### 1. Scheduling page restructure

Wrap existing calendar in a `Tabs` component with three tabs:
- **Calendar** (current view)
- **Call-Off Manager** (new)
- **EVV Exception Log** (new)

### 2. Call-Off Manager tab

**Form fields:**
- Caregiver who called off (searchable select from `caregivers`)
- Reason (dropdown: Illness, Family Emergency, Transportation, No-Show, Personal, Other)
- Client affected (searchable select from `clients`)
- Shift date + time (date/time pickers)
- Service type (dropdown: Personal Care, Attendant Care, Respite, Companion)
- Payer/Program (dropdown: ARChoices/Medicaid, DHS Waiver, Private Pay, Optum/VA)
- Urgency (Low / Medium / High / Critical — colored badges)
- Special notes (textarea)

**On submit:** call new edge function `call-off-assistant` which sends a structured prompt to Lovable AI Gateway. System prompt positions the AI as a scheduling coordinator for Home Care Network in Arkansas, aware of ARChoices/DHS/Optum-VA documentation requirements.

**Response card** (dark navy `bg-slate-900` with light text and copy button) renders sections:
1. Immediate Action Steps
2. Replacement Strategy
3. Client Phone Script
4. Caregiver Text Message
5. AxisCare Documentation Note
6. EVV / Authenticare Note

Each section has its own copy-to-clipboard button + a master "Copy All" button.

**Persistence:** save each event to a new `call_off_events` table (form input + AI response JSON), scoped by RLS to admin/scheduler roles. A small "Recent Call-Offs" list below the form shows last 10.

### 3. EVV Exception Log tab

A table of missed/late clock-ins derived from the existing `appointments` table:
- Late clock-in: `actual_start_time > start_time + 15min` (if those columns exist) OR appointments past end with no completion.
- Missed: appointments with status `scheduled`/`confirmed` whose `end_time < now()` and no clock-out.

**Columns:** Date, Client, Caregiver, Scheduled, Actual, Exception Type (badge), Action.

**Per-row "AI Fix Note" button** opens a dialog and calls the same edge function (different `mode: "evv_fix"`) to generate a formal correction note suitable for Authenticare/ARChoices compliance submission (includes: incident summary, root cause, corrective documentation, attestation language). Dark navy card + copy button, optionally saved to `evv_corrections` table linked to the appointment.

### Technical Details

**Edge function** `supabase/functions/call-off-assistant/index.ts`:
- Verifies JWT, checks user has admin/scheduler role
- Accepts `{ mode: "call_off" | "evv_fix", payload }`
- Calls `https://ai.gateway.lovable.dev/v1/chat/completions` with `LOVABLE_API_KEY` (auto-provisioned)
- Model: `google/gemini-2.5-pro`
- Uses structured JSON output (response_format) so frontend gets clean sections
- Handles 429 (rate limit) and 402 (credit exhaustion) with clear errors

**Database migrations:**
- `call_off_events` (id, caregiver_id, client_id, reason, shift_start, service_type, payer, urgency, notes, ai_response jsonb, created_by, created_at) + RLS + GRANTs
- `evv_corrections` (id, appointment_id, exception_type, ai_note jsonb, created_by, created_at) + RLS + GRANTs
- Both tables: admins have full access, authenticated users with `scheduler` role can read/insert

**Files:**
- `src/pages/Scheduling.tsx` — wrap in Tabs
- `src/components/scheduling/CallOffManager.tsx` — form + response card
- `src/components/scheduling/EvvExceptionLog.tsx` — table + AI dialog
- `src/components/scheduling/AiResponseCard.tsx` — reusable dark navy card with copy buttons
- `src/hooks/useCallOffAssistant.ts` — invokes edge function
- `supabase/functions/call-off-assistant/index.ts`
- 1 migration

### Notes

- No Anthropic API key needed; Lovable AI Gateway provides Gemini 2.5 Pro (equivalent reasoning quality to Claude Sonnet 4) at no extra setup.
- Existing calendar functionality is untouched.
- All AI responses persisted for audit (HIPAA compliance).
