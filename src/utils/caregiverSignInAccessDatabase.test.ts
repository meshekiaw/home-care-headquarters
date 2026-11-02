import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
const sql = readFileSync(new URL("../../drizzle/migrations/0038_admin_caregiver_sign_in_access.sql", import.meta.url), "utf8");
const trainingSql = readFileSync(new URL("../../drizzle/migrations/0036_training_session_auto_assign.sql", import.meta.url), "utf8");
const assignmentFunction = trainingSql.match(/CREATE OR REPLACE FUNCTION public\.assign_training_sessions[\s\S]*?\$\$;/)?.[0];
const db = new PGlite();
const actor = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", caregiver = "11111111-1111-4111-8111-111111111111", account = "22222222-2222-4222-8222-222222222222", other = "33333333-3333-4333-8333-333333333333", requestId = "44444444-4444-4444-8444-444444444444";
const email = "test-caregiver@example.invalid";
const snapshot = async () => (await db.query<{ value: { state: string; problem: string; history: unknown[] } }>("SELECT public.caregiver_access_snapshot($1,$2) AS value", [actor, caregiver])).rows[0]?.value;
const intent = () => db.query("SELECT public.record_caregiver_access_event($1,$2,$3,$4,'requested')", [actor, caregiver, email, requestId]);
const finish = () => db.query("SELECT public.finish_caregiver_access($1,$2,$3,$4,$5)", [actor, caregiver, email, account, requestId]);
const roles = async () => (await db.query<{ role: string }>("SELECT role FROM public.user_roles WHERE user_id=$1 ORDER BY role", [account])).rows.map(r => r.role);
beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE TABLE public.caregivers(id uuid PRIMARY KEY,first_name text,last_name text,email text,status text,auth_user_id uuid UNIQUE);
    CREATE TABLE public.user_roles(user_id uuid,role text,UNIQUE(user_id,role));
    CREATE FUNCTION public.has_role(u uuid,r text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=u AND role=r) $$;
    CREATE TABLE public.lms_courses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,session_number integer,is_active boolean);
    CREATE TABLE public.lms_assignments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,course_id uuid,caregiver_id uuid,assigned_by text,status text DEFAULT 'assigned',completed_at timestamptz,score integer,attempts integer DEFAULT 0,UNIQUE(caregiver_id,course_id));
  `);
  if (!assignmentFunction) throw new Error("Training assignment function not found");
  await db.exec(assignmentFunction); await db.exec(sql);
}, 15000);
beforeEach(async () => {
  await db.exec("TRUNCATE public.caregiver_access_events,public.user_roles,public.caregivers,auth.users,public.lms_assignments,public.lms_courses");
  await db.query("INSERT INTO auth.users VALUES($1,'test-actor@example.invalid'),($2,$3)", [actor, account, email]);
  await db.query("INSERT INTO public.user_roles VALUES($1,'admin')", [actor]);
  await db.query("INSERT INTO public.caregivers VALUES($1,'Test','Caregiver',$2,'active',NULL)", [caregiver, email]);
  await db.query("INSERT INTO public.lms_courses(user_id,session_number,is_active) SELECT $1,n,true FROM generate_series(1,12) n", [actor]);
});
afterAll(async () => { await db.close(); });
describe("caregiver access migration in an isolated database", () => {
  it("distinguishes ready, no account, not set up and no email using actual roles and links", async () => {
    expect((await snapshot())?.state).toBe("not_set_up"); await db.query("DELETE FROM auth.users WHERE id=$1", [account]); expect((await snapshot())?.state).toBe("no_account");
    await db.query("UPDATE public.caregivers SET email=NULL WHERE id=$1", [caregiver]); expect((await snapshot())?.state).toBe("no_email");
    await db.query("UPDATE public.caregivers SET email=$1 WHERE id=$2", [email, caregiver]); await db.query("INSERT INTO auth.users VALUES($1,$2)", [account, email]);
    await intent(); await finish(); expect((await snapshot())?.state).toBe("ready");
  });
  it("requires a real admin role in the database for privileged operations", async () => {
    await db.query("DELETE FROM public.user_roles WHERE user_id=$1", [actor]);
    await expect(snapshot()).rejects.toThrow("Only admins"); await expect(intent()).rejects.toThrow("Only admins"); await expect(finish()).rejects.toThrow("Only admins"); expect(await roles()).toEqual([]);
  });
  it("preserves an existing admin role while adding caregiver access", async () => {
    await db.query("INSERT INTO public.user_roles VALUES($1,'admin')", [account]); await intent(); await finish(); expect(await roles()).toEqual(["admin","caregiver"]);
  });
  it("rejects nurse accounts without adding caregiver role or linking", async () => {
    await db.query("INSERT INTO public.user_roles VALUES($1,'nurse')", [account]); await intent();
    await expect(finish()).rejects.toThrow("This email belongs to a nurse account. Use a different email for her caregiver access."); expect(await roles()).toEqual(["nurse"]);
    expect((await db.query<{ link: string | null }>("SELECT auth_user_id AS link FROM public.caregivers WHERE id=$1", [caregiver])).rows[0]?.link).toBeNull();
  });
  it("identifies and refuses the different caregiver using the account", async () => {
    await db.query("INSERT INTO public.caregivers VALUES($1,'Other','Test Caregiver','other@example.invalid','inactive',$2)", [other, account]);
    await intent(); await expect(finish()).rejects.toThrow("Other Test Caregiver"); expect(await roles()).toEqual([]);
  });
  it("refuses duplicate caregiver emails even when the other record is inactive", async () => {
    await db.query("INSERT INTO public.caregivers VALUES($1,'Other','Test Caregiver',$2,'inactive',NULL)", [other, email.toUpperCase()]);
    await intent(); await expect(finish()).rejects.toThrow("Other Test Caregiver"); expect(await roles()).toEqual([]);
  });
  it("never replaces a caregiver's different existing login", async () => {
    await db.query("UPDATE public.caregivers SET auth_user_id=$1 WHERE id=$2", [other, caregiver]); await intent(); await expect(finish()).rejects.toThrow("different sign-in account"); expect(await roles()).toEqual([]);
  });
  it("rechecks confirmed email before committing", async () => {
    await intent(); await db.query("UPDATE public.caregivers SET email='changed@example.invalid' WHERE id=$1", [caregiver]); await expect(finish()).rejects.toThrow("profile email or account changed"); expect(await roles()).toEqual([]);
  });
  it("will not grant access without recorded admin confirmation", async () => { await expect(finish()).rejects.toThrow("confirmation was not recorded"); expect(await roles()).toEqual([]); });
  it("assigns all 12 sessions idempotently without changing completed assignments", async () => {
    await db.query("INSERT INTO public.lms_assignments(user_id,course_id,caregiver_id,status,score,attempts,completed_at) SELECT $1,id,$2,'completed',100,2,'2026-01-01' FROM public.lms_courses WHERE session_number=1", [actor, caregiver]);
    await intent(); await finish(); await finish();
    expect((await db.query<{ count: number }>("SELECT count(*)::integer AS count FROM public.lms_assignments WHERE caregiver_id=$1", [caregiver])).rows[0]?.count).toBe(12);
    expect((await db.query("SELECT score,attempts,status FROM public.lms_assignments WHERE status='completed'")).rows[0]).toEqual({ score: 100, attempts: 2, status: "completed" });
    expect((await db.query<{ count: number }>("SELECT count(*)::integer AS count FROM public.caregiver_access_events WHERE event='succeeded'")).rows[0]?.count).toBe(1);
  });
  it("refuses setup if fewer than 12 sessions exist", async () => {
    await db.exec("DELETE FROM public.lms_courses WHERE session_number=12"); await intent(); await expect(finish()).rejects.toThrow("All 12 training sessions"); expect(await roles()).toEqual([]);
  });
  it("records actor, caregiver, email and timestamp and prevents edits/deletes", async () => {
    await intent(); await finish(); const event = (await db.query<{ created_at: Date }>("SELECT * FROM public.caregiver_access_events WHERE event='succeeded'")).rows[0];
    expect(event).toMatchObject({ actor_id: actor, caregiver_id: caregiver, email, caregiver_name: "Test Caregiver", actor_email: "test-actor@example.invalid" }); expect(event?.created_at).toBeTruthy();
    await expect(db.exec("UPDATE public.caregiver_access_events SET detail='tampered'")).rejects.toThrow("append-only"); await expect(db.exec("DELETE FROM public.caregiver_access_events")).rejects.toThrow("append-only");
  });
  it("cannot grant access without atomically saving the success event", async () => {
    await intent(); await db.exec("CREATE FUNCTION fail_access_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.event='succeeded' THEN RAISE EXCEPTION 'Synthetic audit failure'; END IF; RETURN NEW; END; $$; CREATE TRIGGER fail_access_audit BEFORE INSERT ON public.caregiver_access_events FOR EACH ROW EXECUTE FUNCTION fail_access_audit()");
    try { await expect(finish()).rejects.toThrow("Synthetic audit failure"); expect(await roles()).toEqual([]); expect((await db.query<{ count: number }>("SELECT count(*)::integer AS count FROM public.lms_assignments")).rows[0]?.count).toBe(0); }
    finally { await db.exec("DROP TRIGGER fail_access_audit ON public.caregiver_access_events; DROP FUNCTION fail_access_audit()"); }
  });
  it("restricts service operations and denies non-admin status reads", async () => {
    expect((await db.query("SELECT has_function_privilege('authenticated','public.finish_caregiver_access(uuid,uuid,text,uuid,uuid)','EXECUTE') AS can_finish, has_function_privilege('anon','public.admin_caregiver_access(uuid)','EXECUTE') AS anon_status, has_table_privilege('authenticated','public.caregiver_access_events','INSERT') AS can_insert")).rows[0]).toEqual({ can_finish: false, anon_status: false, can_insert: false });
    await expect(db.query("SELECT public.admin_caregiver_access($1)", [caregiver])).rejects.toThrow("Only admins");
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [account]); await expect(db.query("SELECT public.admin_caregiver_access($1)", [caregiver])).rejects.toThrow("Only admins");
  });
});