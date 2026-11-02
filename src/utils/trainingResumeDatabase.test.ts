import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
const sql = readFileSync(new URL("../../drizzle/migrations/0035_training_resume.sql", import.meta.url), "utf8");
const db = new PGlite();
const user = "11111111-1111-4111-8111-111111111111", cg = "22222222-2222-4222-8222-222222222222";
const assignment = "33333333-3333-4333-8333-333333333333", course = "44444444-4444-4444-8444-444444444444";
const q1 = "55555555-5555-4555-8555-555555555555", q2 = "66666666-6666-4666-8666-666666666666";
const draft = (question: string | null = q1, answer = "A", attempts = 0) => db.query<{ answers: Record<string, string> }>(
  "select (public.save_training_quiz_draft($1,$2,$3,$4)).*", [assignment, attempts, question, question ? answer : null]);
const video = (position: number, watched: number, time = "2026-01-01T12:00:00Z") => db.query<{ watched_seconds: string; last_position_seconds: string; percent_complete: number; video_completed_at: string }>(
  "select (public.save_training_video_progress($1,$2,$3,100,$4)).*", [assignment, position, watched, time]);

beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
    CREATE TABLE public.caregivers(id uuid PRIMARY KEY,auth_user_id uuid);
    CREATE TABLE public.lms_courses(id uuid PRIMARY KEY);
    CREATE TABLE public.lms_assignments(id uuid PRIMARY KEY,caregiver_id uuid,course_id uuid,status text,score integer,completed_at timestamptz);
    CREATE TABLE public.lms_quiz_questions(id uuid PRIMARY KEY,course_id uuid,options jsonb);
    CREATE TABLE public.lms_quiz_attempts(id uuid DEFAULT gen_random_uuid(),assignment_id uuid);
    CREATE TABLE public.lms_video_progress(id uuid DEFAULT gen_random_uuid(),user_id uuid,assignment_id uuid UNIQUE,course_id uuid,caregiver_id uuid,
      watched_seconds numeric DEFAULT 0,duration_seconds numeric DEFAULT 0,percent_complete integer DEFAULT 0,last_position_seconds numeric DEFAULT 0,video_completed_at timestamptz);
  `);
  await db.exec(sql);
}, 20000);
beforeEach(async () => {
  await db.exec("TRUNCATE lms_quiz_drafts,lms_video_progress,lms_quiz_attempts,lms_quiz_questions,lms_assignments,lms_courses,caregivers CASCADE");
  await db.query("select set_config('test.uid',$1,false)", [user]);
  await db.query("insert into caregivers values($1,$2)", [cg, user]);
  await db.query("insert into lms_courses values($1)", [course]);
  await db.query("insert into lms_assignments values($1,$2,$3,'in_progress',null,null)", [assignment, cg, course]);
  await db.query("insert into lms_quiz_questions values($1,$3,'[\"A\",\"B\"]'),($2,$3,'[\"A\",\"B\"]')", [q1, q2, course]);
});
afterAll(async () => { await db.close(); });

describe("server training drafts and video resume (isolated database)", () => {
  it("stores each answer separately and preserves other answers", async () => {
    await draft(); const result = await draft(q2, "B"); expect(result.rows[0]?.answers).toEqual({ [q1]: "A", [q2]: "B" });
  });
  it("saving an answer does not grade or change completion records", async () => {
    await draft();
    expect((await db.query("select * from lms_quiz_attempts")).rows).toEqual([]);
    expect((await db.query("select status,score,completed_at from lms_assignments")).rows[0]).toEqual({ status: "in_progress", score: null, completed_at: null });
  });
  it("rejects answers not offered for this assignment", async () => { await expect(draft(q1, "not offered")).rejects.toThrow(); });
  it("does not clear answers when entering an unfinished quiz again", async () => { await draft(); expect((await draft(null)).rows[0]?.answers).toEqual({ [q1]: "A" }); });
  it("clears drafts after grading while retaining the attempt", async () => {
    await draft(); await db.query("insert into lms_quiz_attempts(assignment_id) values($1)", [assignment]);
    expect((await db.query("select * from lms_quiz_drafts")).rows).toEqual([]);
    expect((await db.query("select * from lms_quiz_attempts")).rows).toHaveLength(1);
  });
  it("rejects delayed answers from a graded attempt", async () => {
    await draft(); await db.query("insert into lms_quiz_attempts(assignment_id) values($1)", [assignment]);
    await expect(draft()).rejects.toThrow("already submitted");
  });
  it("a retake starts with no filled answers", async () => {
    await draft(); await db.query("insert into lms_quiz_attempts(assignment_id) values($1)", [assignment]);
    expect((await draft(null, "", 1)).rows[0]?.answers).toEqual({});
  });
  it("other users cannot access or write the caregiver's draft or video", async () => {
    await draft(); await db.query("select set_config('test.uid',$1,false)", [course]);
    await expect(draft()).rejects.toThrow(); await expect(video(1, 1)).rejects.toThrow();
    await db.exec("SET ROLE authenticated");
    expect((await db.query("select * from lms_quiz_drafts")).rows).toEqual([]); await db.exec("RESET ROLE");
  });
  it("saves rewound position separately without reducing watched credit", async () => {
    await video(70, 70); const r = (await video(12, 12, "2026-01-01T12:00:10Z")).rows[0];
    expect(Number(r?.last_position_seconds)).toBe(12); expect(Number(r?.watched_seconds)).toBe(70); expect(r?.percent_complete).toBe(70);
  });
  it("older device requests cannot replace a newer position", async () => {
    await video(60, 60, "2026-01-01T12:00:20Z"); const r = (await video(30, 30, "2026-01-01T12:00:10Z")).rows[0];
    expect(Number(r?.last_position_seconds)).toBe(60); expect(Number(r?.watched_seconds)).toBe(60);
  });
  it("preserves the existing quiz gate and watch completion date", async () => {
    expect((await video(94, 94)).rows[0]?.video_completed_at).toBeNull();
    const before = (await video(95, 95)).rows[0]; expect(before?.percent_complete).toBe(95); expect(before?.video_completed_at).toBeTruthy();
    const after = (await video(0, 0, "2026-01-01T12:00:30Z")).rows[0];
    expect(after?.percent_complete).toBe(95); expect(after?.video_completed_at).toEqual(before?.video_completed_at);
  });
  it("rejects a current position ahead of watched credit", async () => { await expect(video(80, 20)).rejects.toThrow(); });
  it("anonymous users cannot save progress or answers", async () => {
    expect((await db.query("select has_function_privilege('anon','public.save_training_quiz_draft(uuid,integer,uuid,text)','EXECUTE') as draft,has_function_privilege('anon','public.save_training_video_progress(uuid,numeric,numeric,numeric,timestamptz)','EXECUTE') as video")).rows[0]).toEqual({ draft: false, video: false });
  });
});