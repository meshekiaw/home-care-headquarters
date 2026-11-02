import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { form618WitnessNamesMatch } from "./form618Witnesses";

const migration = readFileSync(new URL("../../drizzle/migrations/0037_618_distinct_witness_names.sql", import.meta.url), "utf8");
const completionSql = readFileSync(new URL("../../drizzle/migrations/0013_va_nurse_visit_cycle.sql", import.meta.url), "utf8");
const slotsSql = readFileSync(new URL("../../drizzle/migrations/0015_618_signature_slots.sql", import.meta.url), "utf8");
const db = new PGlite();
const formId = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
const assessmentId = "33333333-3333-4333-8333-333333333333";

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '${formId}'::uuid$$;
    CREATE TYPE public.app_role AS ENUM ('admin','nurse');
    CREATE FUNCTION public.has_role(uuid,app_role) RETURNS boolean LANGUAGE sql AS $$SELECT true$$;
    CREATE FUNCTION public.current_nurse_id() RETURNS uuid LANGUAGE sql AS $$SELECT null::uuid$$;
    CREATE TABLE public.assessment_618_forms (id uuid PRIMARY KEY, client_id uuid, nurse_assessment_id uuid, nurse_id uuid,
      status text, signed_at timestamptz, amends_form_id uuid, version integer DEFAULT 1,
      client_signature_status text DEFAULT 'pending', client_signature_exception_reason text, client_signs_by_mark boolean DEFAULT false);
    CREATE TABLE public.assessment_618_signatures (form_id uuid, signature_slot text, signer_name text, signer_type text);
    CREATE TABLE public.clients (id uuid PRIMARY KEY, payer_type text, form_618_date date, form_618_expiration_date date,
      nurse_visit_due_date date, updated_at timestamptz);
    CREATE TABLE public.nurse_assessments (id uuid PRIMARY KEY, status text, completed_at timestamptz,
      assigned_nurse_id uuid, scheduled_date date, scheduled_time time);
    CREATE TABLE public.audit_logs (user_id uuid, action text, table_name text, record_id text, old_data jsonb, new_data jsonb);
  `);
  const helper = slotsSql.match(/CREATE OR REPLACE FUNCTION public\.form_618_signatures_complete[\s\S]*?\$\$;/)?.[0];
  const complete = completionSql.match(/CREATE OR REPLACE FUNCTION public\.complete_618_form[\s\S]*?\$function\$;/)?.[0];
  if (!helper || !complete) throw new Error("Existing 618 rules not found");
  await db.exec(helper);
  await db.exec(complete);
  await db.query("INSERT INTO assessment_618_forms(id,status) VALUES($1,'signed')", [formId]);
  await db.query("INSERT INTO assessment_618_signatures VALUES($1,'sec4_witness_1','Old Test Witness','witness'),($1,'sec4_witness_2','Old Test Witness','witness')", [formId]);
  const before = await db.query("SELECT * FROM assessment_618_forms");
  await db.exec(migration);
  expect((await db.query("SELECT * FROM assessment_618_forms")).rows).toEqual(before.rows);
}, 20000);

beforeEach(async () => {
  await db.exec("TRUNCATE assessment_618_signatures,assessment_618_forms,clients,nurse_assessments,audit_logs");
  await db.query("INSERT INTO clients(id,payer_type) VALUES($1,'VA')", [clientId]);
  await db.query("INSERT INTO nurse_assessments(id,status) VALUES($1,'Pending')", [assessmentId]);
  await db.query("INSERT INTO assessment_618_forms(id,client_id,nurse_assessment_id,status) VALUES($1,$2,$3,'draft')", [formId, clientId, assessmentId]);
  await db.query(`INSERT INTO assessment_618_signatures VALUES
    ($1,'sec11_nurse','Test Nurse','nurse'),($1,'sec4_client','Test Client','client'),($1,'sec13_client','Test Client','client')`, [formId]);
});
afterAll(async () => { await db.close(); });

async function witnesses(first: string, second: string) {
  await db.query("INSERT INTO assessment_618_signatures VALUES($1,'sec4_witness_1',$2,'witness'),($1,'sec4_witness_2',$3,'witness')", [formId, first, second]);
}
const complete = () => db.query<{ result: { success: boolean; reason?: string } }>("SELECT complete_618_form($1) AS result", [formId]);

describe("618 distinct witnesses with synthetic data only", () => {
  it.each([['Test Witness','Test Witness'], [' Test  Witness ','test witness'], ['Test\tWitness','TEST Witness']])("blocks matching witness names %s / %s atomically", async (first, second) => {
    expect(form618WitnessNamesMatch(first, second)).toBe(true);
    await witnesses(first, second);
    await expect(complete()).rejects.toThrow("The two witnesses must be different people.");
    expect((await db.query("SELECT status,signed_at FROM assessment_618_forms")).rows[0]).toEqual({ status: "draft", signed_at: null });
    expect((await db.query("SELECT form_618_date,nurse_visit_due_date FROM clients")).rows[0]).toEqual({ form_618_date: null, nurse_visit_due_date: null });
    expect((await db.query("SELECT * FROM audit_logs")).rows).toHaveLength(0);
    expect((await db.query("SELECT status FROM nurse_assessments")).rows[0]).toEqual({ status: "Pending" });
  });
  it("blocks direct completion even when witnesses are optional", async () => {
    await witnesses("Test Witness", "Test Witness");
    await expect(db.query("UPDATE assessment_618_forms SET status='signed' WHERE id=$1", [formId])).rejects.toThrow("The two witnesses must be different people.");
  });
  it("allows two different witnesses with the existing mark requirement", async () => {
    await db.query("UPDATE assessment_618_forms SET client_signs_by_mark=true WHERE id=$1", [formId]);
    await witnesses("Test Witness One", "Test Witness Two");
    expect(form618WitnessNamesMatch("Test Witness One", "Test Witness Two")).toBe(false);
    expect((await complete()).rows[0]?.result.success).toBe(true);
    expect((await db.query("SELECT status FROM assessment_618_forms")).rows[0]).toEqual({ status: "signed" });
  });
  it("preserves optional absent witnesses and the same client signing both client sections", async () => {
    expect(form618WitnessNamesMatch(null, null)).toBe(false);
    expect((await complete()).rows[0]?.result.success).toBe(true);
  });
  it("preserves the requirement for two witnesses when signing by mark", async () => {
    await db.query("UPDATE assessment_618_forms SET client_signs_by_mark=true WHERE id=$1", [formId]);
    expect((await complete()).rows[0]?.result).toEqual({ success: false, reason: "signatures_incomplete" });
  });
  it("preserves superseding historical forms and their duplicate signatures", async () => {
    await db.query("UPDATE assessment_618_forms SET status='signed' WHERE id=$1", [formId]);
    await witnesses("Historical Test Witness", "Historical Test Witness");
    await db.query("UPDATE assessment_618_forms SET status='amended' WHERE id=$1", [formId]);
    expect((await db.query("SELECT signer_name FROM assessment_618_signatures WHERE signature_slot LIKE 'sec4_witness_%'")).rows).toEqual([
      { signer_name: "Historical Test Witness" }, { signer_name: "Historical Test Witness" },
    ]);
  });
});