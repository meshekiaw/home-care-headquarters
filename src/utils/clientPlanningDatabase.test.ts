import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
const sql = readFileSync(new URL("../../drizzle/migrations/0039_client_payers_requested_schedule_status.sql", import.meta.url), "utf8");
const db = new PGlite();
const actor = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", clientId = "11111111-1111-4111-8111-111111111111";
beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE TABLE public.user_roles(user_id uuid,role text);
    CREATE FUNCTION public.has_role(u uuid,r text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=u AND role=r) $$;
    CREATE TABLE public.clients(id uuid PRIMARY KEY,first_name text,last_name text,status text DEFAULT 'active',payer_type text DEFAULT 'VA',form_618_expiration_date date DEFAULT '2027-02-01',nurse_visit_due_date date DEFAULT '2026-08-01',client_hours numeric DEFAULT 40);
    INSERT INTO public.clients(id,first_name,last_name) VALUES ('${clientId}','Made-up','Test Client');`);
  await db.exec(sql);
  expect((await db.query("SELECT * FROM clients")).rows[0]).toMatchObject({ status: "active", payer_type: "VA", payers: [], client_status: "not_set", requested_schedule: {}, client_hours: "40" });
}, 15000);
beforeEach(async () => {
  await db.exec("TRUNCATE public.client_status_history,public.clients,public.user_roles,auth.users");
  await db.query("INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,'synthetic-admin@example.invalid','{\"full_name\":\"Synthetic Office Admin\"}')", [actor]);
  await db.query("INSERT INTO user_roles VALUES($1,'admin')", [actor]);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [actor]);
  await db.query("INSERT INTO clients(id,first_name,last_name) VALUES($1,'Made-up','Test Client')", [clientId]);
});
afterAll(async () => { await db.close(); });
const history = async () => (await db.query("SELECT * FROM client_status_history ORDER BY changed_at,id")).rows;
describe("client planning migration in a disposable synthetic database", () => {
  it("keeps all existing fields unchanged when planning details change", async () => {
    await db.query("UPDATE clients SET payers=ARRAY['VA','Private pay'],client_status='current_staffed' WHERE id=$1", [clientId]);
    expect((await db.query("SELECT status,payer_type,form_618_expiration_date::text,nurse_visit_due_date::text,client_hours::integer FROM clients")).rows[0]).toEqual({ status: "active", payer_type: "VA", form_618_expiration_date: "2027-02-01", nurse_visit_due_date: "2026-08-01", client_hours: 40 });
  });
  it.each(["payers=ARRAY['ARChoices']", "requested_schedule_notes='Test note'", "client_status='new_client'"])("requires admin authorization for %s", async assignment => {
    await db.exec("DELETE FROM user_roles"); await expect(db.query(`UPDATE clients SET ${assignment} WHERE id=$1`, [clientId])).rejects.toThrow("Only admins"); expect(await history()).toHaveLength(0);
  });
  it("blocks unauthenticated planning changes", async () => { await db.exec("SELECT set_config('request.jwt.claim.sub','',false)"); await expect(db.query("UPDATE clients SET payers=ARRAY['VA'] WHERE id=$1", [clientId])).rejects.toThrow("Only admins"); });
  it("allows legacy automated changes without an admin when planning fields are unchanged", async () => {
    await db.exec("SELECT set_config('request.jwt.claim.sub','',false)"); await db.query("UPDATE clients SET form_618_expiration_date='2028-02-01' WHERE id=$1", [clientId]);
    expect((await db.query("SELECT form_618_expiration_date::text FROM clients")).rows[0]).toEqual({ form_618_expiration_date: "2028-02-01" }); expect(await history()).toHaveLength(0);
  });
  it("accepts multiple payers and requires Other text", async () => {
    await db.query("UPDATE clients SET payers=ARRAY['Medicaid personal care','ARChoices','VA','Private pay','Other'],payer_other='Synthetic program' WHERE id=$1", [clientId]);
    expect((await db.query<{ payers: string[] }>("SELECT payers FROM clients")).rows[0]?.payers).toHaveLength(5); await expect(db.query("UPDATE clients SET payer_other=' ' WHERE id=$1", [clientId])).rejects.toThrow("other payer");
  });
  it.each(["ARRAY['Unknown']", "ARRAY['VA','VA']", "ARRAY['VA',NULL]"])("rejects invalid payer array %s", async payers => { await expect(db.query(`UPDATE clients SET payers=${payers} WHERE id=$1`, [clientId])).rejects.toThrow("valid, distinct payers"); });
  it("requires an admit date and accepts no expected return", async () => {
    await expect(db.query("UPDATE clients SET client_status='hospitalized' WHERE id=$1", [clientId])).rejects.toThrow("status date");
    await db.query("UPDATE clients SET client_status='hospitalized',client_status_date='2026-11-04' WHERE id=$1", [clientId]); expect((await history())[0]).toMatchObject({ new_status: "hospitalized", expected_return_date: null });
  });
  it("rejects return before admission", async () => { await expect(db.query("UPDATE clients SET client_status='hospitalized',client_status_date='2026-11-04',expected_return_date='2026-11-03' WHERE id=$1", [clientId])).rejects.toThrow("Expected return"); });
  it.each(["on_hold", "discharged"])("requires date and reason for %s", async status => {
    await expect(db.query("UPDATE clients SET client_status=$2 WHERE id=$1", [clientId, status])).rejects.toThrow("status date");
    await expect(db.query("UPDATE clients SET client_status=$2,client_status_date='2026-11-04',client_status_reason=' ' WHERE id=$1", [clientId, status])).rejects.toThrow("reason");
    await db.query("UPDATE clients SET client_status=$2,client_status_date='2026-11-04',client_status_reason='Synthetic reason' WHERE id=$1", [clientId, status]); expect((await history())[0]).toMatchObject({ new_status: status, reason: "Synthetic reason" });
  });
  it.each(["new_client", "current_staffed", "current_needs_staffing"])("accepts single status %s", async status => { await db.query("UPDATE clients SET client_status=$2 WHERE id=$1", [clientId, status]); expect((await history())[0]).toMatchObject({ previous_status: "not_set", new_status: status }); });
  it("rejects unknown statuses", async () => { await expect(db.query("UPDATE clients SET client_status='active' WHERE id=$1", [clientId])).rejects.toThrow("valid client status"); });
  it("records every transition and metadata correction with the actual actor and timestamp", async () => {
    await db.query("UPDATE clients SET client_status='new_client',client_status_date='2026-11-04' WHERE id=$1", [clientId]);
    await db.query("UPDATE clients SET client_status='hospitalized',client_status_date='2026-11-05',expected_return_date='2026-11-08' WHERE id=$1", [clientId]);
    await db.query("UPDATE clients SET expected_return_date='2026-11-09' WHERE id=$1", [clientId]);
    const events = await history(); expect(events).toHaveLength(3); expect(events[1]).toMatchObject({ previous_status: "new_client", new_status: "hospitalized", actor_id: actor, actor_name: "Synthetic Office Admin" }); expect(events[1]?.changed_at).toBeTruthy();
    await db.query("UPDATE clients SET client_status=client_status WHERE id=$1", [clientId]); expect(await history()).toHaveLength(3);
  });
  it("records selected status on new client creation atomically", async () => {
    await db.query("INSERT INTO clients(id,first_name,client_status) VALUES('22222222-2222-4222-8222-222222222222','Another Made-up','new_client')"); expect((await history())[0]).toMatchObject({ new_status: "new_client", actor_id: actor });
  });
  it("refuses history forgery, edits, deletion and deleting a client with history", async () => {
    await db.query("UPDATE clients SET client_status='new_client' WHERE id=$1", [clientId]);
    await expect(db.exec("UPDATE client_status_history SET reason='Tampered'")).rejects.toThrow("append-only"); await expect(db.exec("DELETE FROM client_status_history")).rejects.toThrow("append-only");
    await expect(db.query("INSERT INTO client_status_history(client_id,previous_status,new_status,effective_date,actor_id,actor_name) VALUES($1,'not_set','discharged','2026-11-04',$2,'Forged')", [clientId, actor])).rejects.toThrow("append-only"); await expect(db.query("DELETE FROM clients WHERE id=$1", [clientId])).rejects.toThrow("foreign key");
  });
  it.each([[], { monday: { enabled: true, start: "09:00", end: "13:00" } }, { mon: { enabled: "true" } }, { mon: { enabled: true, start: "09:00", end: "09:00" } }, { mon: { enabled: true, start: "25:00", end: "13:00" } }])("rejects malformed schedule %j", async schedule => { await expect(db.query("UPDATE clients SET requested_schedule=$2::jsonb WHERE id=$1", [clientId, JSON.stringify(schedule)])).rejects.toThrow(); });
  it("accepts a week including overnight and disabled days", async () => {
    await db.query("UPDATE clients SET requested_schedule=$2::jsonb WHERE id=$1", [clientId, JSON.stringify({ mon: { enabled: true, start: "09:00", end: "13:00" }, sat: { enabled: true, start: "22:00", end: "02:00" }, sun: { enabled: false, start: "", end: "" } })]);
    expect((await db.query("SELECT requested_schedule FROM clients")).rows[0]).toMatchObject({ requested_schedule: { mon: { start: "09:00" }, sat: { end: "02:00" } } });
  });
  it("only grants authenticated history reads and enforces admin-only RLS", async () => {
    expect((await db.query("SELECT has_table_privilege('authenticated','client_status_history','INSERT') AS can_insert,has_table_privilege('anon','client_status_history','SELECT') AS anon_read")).rows[0]).toEqual({ can_insert: false, anon_read: false });
    await db.query("UPDATE clients SET client_status='new_client' WHERE id=$1", [clientId]);
    await db.exec("GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated; SET ROLE authenticated"); expect(await history()).toHaveLength(1);
    await db.exec("RESET ROLE; DELETE FROM user_roles; SET ROLE authenticated"); expect(await history()).toHaveLength(0); await db.exec("RESET ROLE");
  });
});