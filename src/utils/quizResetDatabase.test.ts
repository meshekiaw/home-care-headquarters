import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
const sql = readFileSync(new URL("../../drizzle/migrations/0046_training_quiz_resets.sql", import.meta.url), "utf8");
const db = new PGlite();
const admin = "11111111-1111-4111-8111-111111111111", caregiverUser = "22222222-2222-4222-8222-222222222222";
const cg = "33333333-3333-4333-8333-333333333333", course = "44444444-4444-4444-8444-444444444444", assignment = "55555555-5555-4555-8555-555555555555";
const as = (uid: string) => db.query("select set_config('test.uid',$1,false)", [uid]);
const reset = () => db.query<{ failed_attempts_before: number; reset_by_name: string }>("select * from public.reset_training_quiz($1)", [assignment]);
const attempt = (passed: boolean, at: string, score = passed ? 80 : 50) =>
  db.query("insert into lms_quiz_attempts(assignment_id,passed,score,attempted_at) values($1,$2,$3,$4)", [assignment, passed, score, at]);
const state = async () => (await db.query<{ attempts_since_reset: number; failed_since_reset: number; total_attempts: number }>("select * from public.training_quiz_attempt_state($1)", [assignment])).rows[0];

beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
    CREATE TYPE public.app_role AS ENUM ('admin','user','caregiver','nurse');
    CREATE TABLE public.user_roles(user_id uuid, role public.app_role);
    CREATE FUNCTION public.has_role(u uuid, r public.app_role) RETURNS boolean LANGUAGE sql AS $$SELECT exists(SELECT 1 FROM public.user_roles WHERE user_id=u AND role=r)$$;
    CREATE FUNCTION public.onboarding_actor_name(u uuid) RETURNS text LANGUAGE sql AS $$SELECT 'Office Admin'$$;
    CREATE TABLE public.caregivers(id uuid PRIMARY KEY);
    CREATE TABLE public.lms_courses(id uuid PRIMARY KEY,title text,session_number integer,max_attempts integer,passing_score integer DEFAULT 70);
    CREATE TABLE public.lms_assignments(id uuid PRIMARY KEY,caregiver_id uuid,course_id uuid,status text,score integer,attempts integer,completed_at timestamptz);
    CREATE TABLE public.lms_quiz_attempts(id uuid DEFAULT gen_random_uuid(),assignment_id uuid,passed boolean,score integer,attempted_at timestamptz);
    CREATE TABLE public.lms_quiz_drafts(assignment_id uuid PRIMARY KEY,answers jsonb);
    CREATE TABLE public.lms_video_progress(assignment_id uuid PRIMARY KEY,percent_complete integer,last_position_seconds numeric);`);
  await db.exec(sql);
}, 20000);
beforeEach(async () => {
  await db.exec("TRUNCATE lms_quiz_resets,lms_quiz_drafts,lms_video_progress,lms_quiz_attempts,lms_assignments,lms_courses,caregivers,user_roles CASCADE");
  await db.query("insert into user_roles values($1,'admin'),($2,'caregiver')", [admin, caregiverUser]);
  await db.query("insert into caregivers values($1)", [cg]);
  await db.query("insert into lms_courses(id,title,session_number,max_attempts) values($1,'Infection Control',3,2)", [course]);
  await db.query("insert into lms_assignments values($1,$2,$3,'in_progress',50,2,null)", [assignment, cg, course]);
  await db.query("insert into lms_video_progress values($1,100,612)", [assignment]);
  await db.query(`insert into lms_quiz_drafts values($1,'{"q1":"A"}')`, [assignment]);
  await attempt(false, "2026-11-01T10:00:00Z"); await attempt(false, "2026-11-02T10:00:00Z");
  await as(admin);
});
afterAll(async () => { await db.close(); });

describe("admin quiz reset (isolated database)", () => {
  it("refuses anyone who is not a signed-in admin", async () => {
    await as(caregiverUser);
    await expect(reset()).rejects.toThrow("Only admins can reset quizzes.");
    await as("");
    await expect(reset()).rejects.toThrow("Only admins can reset quizzes.");
    await as(caregiverUser);
    await expect(db.query("select * from public.admin_quiz_reset_status()")).rejects.toThrow("Only admins");
  });

  it("lists two failed attempts as needing a reset", async () => {
    const rows = (await db.query<{ needs_reset: boolean; failed_since_reset: number }>("select * from public.admin_quiz_reset_status()")).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ needs_reset: true, failed_since_reset: 2 });
  });

  it("one failed attempt does not need a reset and is refused", async () => {
    await db.exec("TRUNCATE lms_quiz_attempts"); await attempt(false, "2026-11-01T10:00:00Z");
    expect((await db.query("select * from public.admin_quiz_reset_status()")).rows).toHaveLength(0);
    await expect(reset()).rejects.toThrow("doesn't need a reset");
  });

  it("logs the reset, blanks the quiz and keeps attempts, video progress and the assignment", async () => {
    const before = (await db.query("select * from lms_assignments")).rows;
    const result = (await reset()).rows[0];
    expect(result).toMatchObject({ failed_attempts_before: 2, reset_by_name: "Office Admin" });
    expect((await db.query("select * from lms_quiz_drafts")).rows).toEqual([]);
    expect((await db.query<{ percent_complete: number; last_position_seconds: string }>("select * from lms_video_progress")).rows[0]).toMatchObject({ percent_complete: 100 });
    expect((await db.query("select * from lms_quiz_attempts")).rows).toHaveLength(2);
    expect((await db.query("select * from lms_assignments")).rows).toEqual(before);
    expect(await state()).toMatchObject({ attempts_since_reset: 0, failed_since_reset: 0, total_attempts: 2 });
  });

  it("cannot reset twice in a row, and two new failures lock it again", async () => {
    await reset();
    await expect(reset()).rejects.toThrow("doesn't need a reset");
    await attempt(false, "2099-01-01T10:00:00Z");
    expect(await state()).toMatchObject({ attempts_since_reset: 1, failed_since_reset: 1, total_attempts: 3 });
    await attempt(false, "2099-01-02T10:00:00Z");
    expect((await db.query<{ needs_reset: boolean }>("select * from public.admin_quiz_reset_status()")).rows[0]?.needs_reset).toBe(true);
    await reset();
    expect((await db.query("select * from lms_quiz_resets")).rows).toHaveLength(2);
  });

  it("never offers a reset on a completed session", async () => {
    await db.exec("update lms_assignments set status='completed'");
    expect((await db.query("select * from public.admin_quiz_reset_status()")).rows).toHaveLength(0);
    await expect(reset()).rejects.toThrow("doesn't need a reset");
  });

  it("keeps the reset log unchangeable", async () => {
    await reset();
    await expect(db.query("update lms_quiz_resets set reset_by_name='x'")).rejects.toThrow("cannot be changed");
  });
});
