import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// Run the deployed SQL in an isolated Postgres engine, never the live database.
const sql = readFileSync(new URL("../../drizzle/migrations/0034_caregiver_training_sign_in.sql", import.meta.url), "utf8");
const db = new PGlite();
const caregiverId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const otherId = "33333333-3333-4333-8333-333333333333";
const email = "test-caregiver@example.invalid";
const connect = () => db.query("SELECT public.connect_training_caregiver($1,$2,$3) AS connected", [caregiverId, userId, email]);
const roles = async () => (await db.query<{ role: string }>("SELECT role FROM public.user_roles WHERE user_id=$1 ORDER BY role", [userId])).rows.map(r => r.role);

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text);
    CREATE TABLE public.caregivers(id uuid PRIMARY KEY, email text, status text, auth_user_id uuid UNIQUE);
    CREATE TABLE public.user_roles(user_id uuid, role text, UNIQUE(user_id,role));
  `);
  await db.exec(sql);
}, 15000);
beforeEach(async () => {
  await db.exec("TRUNCATE public.user_roles,public.caregivers,auth.users");
  await db.query("INSERT INTO public.caregivers(id,email,status) VALUES ($1,$2,'active')", [caregiverId, email]);
  await db.query("INSERT INTO auth.users(id,email) VALUES ($1,$2)", [userId, email]);
});
afterAll(async () => { await db.close(); });

describe("server caregiver identity and role rules (isolated database)", () => {
  it("finds the active caregiver and existing account ignoring case and spaces", async () => {
    await db.query("UPDATE public.caregivers SET email=$1 WHERE id=$2", [" Test-Caregiver @ EXAMPLE.invalid  ", caregiverId]);
    const result = await db.query<{ match: { caregiver_id: string; user_id: string } }>("SELECT public.lookup_training_caregiver($1) AS match", [" TEST-CAREGIVER @ example.invalid  "]);
    expect(result.rows[0]?.match).toEqual({ caregiver_id: caregiverId, user_id: userId });
  });
  it("returns no match for inactive caregivers", async () => {
    await db.query("UPDATE public.caregivers SET status='inactive' WHERE id=$1", [caregiverId]);
    const result = await db.query<{ match: unknown }>("SELECT public.lookup_training_caregiver($1) AS match", [email]);
    expect(result.rows[0]?.match).toBeNull();
    await expect(connect()).rejects.toThrow();
    expect(await roles()).toEqual([]);
  });
  it("returns no match for unknown addresses", async () => {
    const result = await db.query<{ match: unknown }>("SELECT public.lookup_training_caregiver($1) AS match", ["not-a-caregiver@example.invalid"]);
    expect(result.rows[0]?.match).toBeNull();
  });
  it("does not choose between duplicate active caregiver emails", async () => {
    await db.query("INSERT INTO public.caregivers(id,email,status) VALUES ($1,$2,'active')", [otherId, email.toUpperCase()]);
    const result = await db.query<{ match: unknown }>("SELECT public.lookup_training_caregiver($1) AS match", [email]);
    expect(result.rows[0]?.match).toBeNull();
    await expect(connect()).rejects.toThrow();
  });
  it("connects an existing roleless login and gives only the caregiver role", async () => {
    await connect();
    const result = await db.query<{ auth_user_id: string }>("SELECT auth_user_id FROM public.caregivers WHERE id=$1", [caregiverId]);
    expect(result.rows[0]?.auth_user_id).toBe(userId);
    expect(await roles()).toEqual(["caregiver"]);
  });
  it("repairs the role on an already connected account and is idempotent", async () => {
    await db.query("UPDATE public.caregivers SET auth_user_id=$1 WHERE id=$2", [userId, caregiverId]);
    await connect(); await connect();
    expect(await roles()).toEqual(["caregiver"]);
  });
  it("preserves an existing ordinary user role while adding caregiver", async () => {
    await db.query("INSERT INTO public.user_roles VALUES ($1,'user')", [userId]);
    await connect();
    expect(await roles()).toEqual(["caregiver", "user"]);
  });
  it.each(["admin", "nurse"])("never removes, changes or adds caregiver to the protected %s role", async role => {
    await db.query("INSERT INTO public.user_roles VALUES ($1,$2)", [userId, role]);
    await connect();
    expect(await roles()).toEqual([role]);
  });
  it("never replaces a caregiver's different existing linked account", async () => {
    await db.query("UPDATE public.caregivers SET auth_user_id=$1 WHERE id=$2", [otherId, caregiverId]);
    await expect(connect()).rejects.toThrow();
    const result = await db.query<{ auth_user_id: string }>("SELECT auth_user_id FROM public.caregivers WHERE id=$1", [caregiverId]);
    expect(result.rows[0]?.auth_user_id).toBe(otherId);
    expect(await roles()).toEqual([]);
  });
  it("never uses an account that is linked to another caregiver", async () => {
    await db.query("INSERT INTO public.caregivers VALUES ($1,'other-test@example.invalid','active',$2)", [otherId, userId]);
    await expect(connect()).rejects.toThrow();
    expect(await roles()).toEqual([]);
  });
  it("rejects an account whose actual email is different", async () => {
    await db.query("UPDATE auth.users SET email='wrong-test@example.invalid' WHERE id=$1", [userId]);
    await expect(connect()).rejects.toThrow();
    expect(await roles()).toEqual([]);
  });
  it("keeps lookup and linking inaccessible to anonymous and signed-in callers", async () => {
    const result = await db.query<{ anon: boolean; authenticated: boolean; service: boolean }>(`
      SELECT has_function_privilege('anon','public.lookup_training_caregiver(text)','EXECUTE') AS anon,
        has_function_privilege('authenticated','public.connect_training_caregiver(uuid,uuid,text)','EXECUTE') AS authenticated,
        has_function_privilege('service_role','public.connect_training_caregiver(uuid,uuid,text)','EXECUTE') AS service
    `);
    expect(result.rows[0]).toEqual({ anon: false, authenticated: false, service: true });
  });
});