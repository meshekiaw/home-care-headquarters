import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2.118.0/cors";
import { z } from "npm:zod@3";
import { ACCESS_TICKET_SECONDS, canArchive, canRead, canUpload, canUseDocuments } from "./access.ts";
import { validateUpload, hasValidFileHeader } from "./upload-rules.ts";

const bucket = "caregiver-documents";
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list"), caregiver_id: z.string().uuid() }),
  z.object({ action: z.literal("request_access"), document_id: z.string().uuid() }),
  z.object({ action: z.literal("open"), ticket: z.string().uuid() }),
  z.object({ action: z.literal("archive"), document_id: z.string().uuid() }),
]);
const Upload = z.object({ caregiver_id: z.string().uuid(), step_key: z.string().min(1).max(60), replace_document_id: z.string().uuid().optional(), replacement_note: z.string().trim().min(1).max(2000).optional() });
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use a signed-in document request." }, 405);
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Please sign in." }, 401);
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key || !serviceKey) return json({ error: "Document storage is temporarily unavailable." }, 503);
    const userClient = createClient(url, key, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: { user }, error: authError } = await userClient.auth.getUser(authorization.slice(7));
    if (authError || !user) return json({ error: "Please sign in again." }, 401);
    const service = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: roleRows, error: roleError } = await service.from("user_roles").select("role").eq("user_id", user.id);
    if (roleError) throw roleError;
    const roles = (roleRows || []).map((r) => r.role as string);
    if (!canUseDocuments(roles)) return json({ error: "You do not have access to caregiver documents." }, 403);
    const isAdmin = roles.includes("admin");

    async function caregiverAccess(caregiverId: string) {
      const { data, error } = await service.from("caregivers").select("id,auth_user_id,status,onboarding_required").eq("id", caregiverId).maybeSingle();
      if (error) throw error;
      if (!data || (!isAdmin && (data.auth_user_id !== user?.id || data.status === "inactive"))) return null;
      return data;
    }

    async function documentAccess(documentId: string) {
      const { data: doc, error } = await service.from("caregiver_documents").select("*").eq("id", documentId).is("archived_at", null).maybeSingle();
      if (error) throw error;
      if (!doc) return null;
      const caregiver = await caregiverAccess(doc.caregiver_id);
      if (!caregiver || !canRead(roles, caregiver.auth_user_id === user?.id, doc.uploaded_by === user?.id)) return null;
      return { doc, caregiver };
    }

    if (req.headers.get("Content-Type")?.includes("multipart/form-data")) {
      const form = await req.formData();
      const parsed = Upload.safeParse({ caregiver_id: form.get("caregiver_id"), step_key: form.get("step_key"), replace_document_id: form.get("replace_document_id") || undefined, replacement_note: form.get("replacement_note") || undefined });
      const file = form.get("file");
      if (!parsed.success || !(file instanceof File) || !file.size) return json({ error: "Choose a file and an onboarding step." }, 400);
      const { caregiver_id, step_key, replace_document_id, replacement_note } = parsed.data;
      if (replace_document_id && (!isAdmin || !replacement_note)) return json({ error: "Only an admin can replace a file, with a replacement note." }, 403);
      if (replace_document_id) {
        const previous = await documentAccess(replace_document_id);
        if (!previous || previous.doc.caregiver_id !== caregiver_id || !["tax_payroll_forms", "background_check", "adult_maltreatment_check", "child_maltreatment_check", "tmu"].includes(step_key)) return json({ error: "Choose this caregiver’s office document." }, 403);
      }
      const fileError = validateUpload(file);
      if (fileError || !(await hasValidFileHeader(file, file.name))) return json({ error: fileError || "This file does not match its file type. Choose a PDF, JPG, PNG, or HEIC file." }, 400);
      const caregiver = await caregiverAccess(caregiver_id);
      if (!caregiver) return json({ error: "You do not have access to this caregiver." }, 403);
      if (!isAdmin && !caregiver.onboarding_required) return json({ error: "Onboarding is not required for your record." }, 403);
      const { data: onboarding, error: onboardingError } = await service.from("caregiver_onboarding").select("id").eq("caregiver_id", caregiver_id).is("archived_at", null).maybeSingle();
      if (onboardingError) throw onboardingError;
      if (!onboarding) return json({ error: "Onboarding is unavailable." }, 404);
      const { data: step, error: stepError } = await service.from("caregiver_onboarding_steps").select("id,status").eq("onboarding_id", onboarding.id).eq("step_key", step_key).maybeSingle();
      if (stepError) throw stepError;
      if (!step || !canUpload(roles, caregiver.auth_user_id === user.id, step_key, step.status === "approved")) return json({ error: "You cannot upload or replace a file for this step." }, 403);
      if (replace_document_id) {
        const previous = await documentAccess(replace_document_id);
        if (!previous || previous.doc.step_id !== step.id) return json({ error: "Choose a document from this step." }, 400);
      }
      const fileName = file.name.replace(/[\r\n\x00/\\]/g, "_").slice(0, 200) || "document";
      const documentId = crypto.randomUUID();
      const path = `${caregiver_id}/${step_key}/${documentId}/${fileName}`;
      // Unique objects only; never overwrite approved or historical files.
      const { error: uploadError } = await service.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
      if (uploadError) return json({ error: "The file could not be uploaded. Check its size and try again." }, 400);
      const registration = replace_document_id ? service.rpc("replace_caregiver_document", {
        p_actor_id: user.id, p_old_document_id: replace_document_id, p_new_document_id: documentId,
        p_object_path: path, p_file_name: fileName, p_mime_type: file.type || "application/octet-stream", p_file_size: file.size, p_note: replacement_note,
      }) : service.rpc("register_caregiver_document", {
        p_actor_id: user.id, p_caregiver_id: caregiver_id, p_step_id: step.id, p_document_id: documentId,
        p_object_path: path, p_file_name: fileName, p_mime_type: file.type || "application/octet-stream", p_file_size: file.size,
      });
      const { data: doc, error: registerError } = await registration;
      if (registerError) {
        await service.storage.from(bucket).remove([path]);
        return json({ error: "The file was not saved. Each step allows two files and approved steps are locked. Refresh and try again." }, 409);
      }
      // Return metadata only, never a storage path or storage URL.
      return json({ document: { id: doc.id, step_id: doc.step_id, file_name: doc.file_name, mime_type: doc.mime_type, file_size: doc.file_size, uploaded_at: doc.uploaded_at } }, 201);
    }

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "The document request is incomplete." }, 400);
    const body = parsed.data;
    if (body.action === "list") {
      const caregiver = await caregiverAccess(body.caregiver_id);
      if (!caregiver) return json({ error: "You do not have access to this caregiver." }, 403);
      let query = service.from("caregiver_documents").select("id,caregiver_id,step_id,file_name,mime_type,file_size,uploaded_by,uploaded_at").eq("caregiver_id", body.caregiver_id).is("archived_at", null).order("uploaded_at", { ascending: false });
      if (!isAdmin) query = query.eq("uploaded_by", user.id);
      const { data, error } = await query;
      if (error) throw error;
      return json({ documents: data });
    }
    if (body.action === "open") {
      const now = new Date().toISOString();
      const { data: ticket, error: ticketError } = await service.from("caregiver_document_access_tickets").update({ used_at: now }).eq("id", body.ticket).eq("user_id", user.id).is("used_at", null).gt("expires_at", now).select("document_id").maybeSingle();
      if (ticketError) throw ticketError;
      if (!ticket) return json({ error: "This file access has expired. Open the file again." }, 403);
      // Reauthorize on consumption; a ticket alone never opens a file.
      const access = await documentAccess(ticket.document_id);
      if (!access) return json({ error: "You no longer have access to this file." }, 403);
      const { doc } = access;
      const { data: file, error: fileError } = await service.storage.from(bucket).download(doc.object_path);
      if (fileError || !file) return json({ error: "The file could not be opened. Try again." }, 404);
      if (isAdmin) {
        const { error: logError } = await service.from("caregiver_document_view_log").insert({ document_id: doc.id, caregiver_id: doc.caregiver_id, admin_id: user.id, file_name: doc.file_name, object_path: doc.object_path });
        if (logError) return json({ error: "The file cannot be opened until its access can be recorded. Try again." }, 503);
      }
      return new Response(file, { headers: {
        ...corsHeaders, "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.file_name)}`,
        "Cache-Control": "no-store, private", "Pragma": "no-cache", "X-Content-Type-Options": "nosniff",
      } });
    }
    const access = await documentAccess(body.document_id);
    if (!access) return json({ error: "You do not have access to this file." }, 403);
    if (body.action === "request_access") {
      const expiresAt = new Date(Date.now() + ACCESS_TICKET_SECONDS * 1000).toISOString();
      const { data, error } = await service.from("caregiver_document_access_tickets").insert({ user_id: user.id, document_id: access.doc.id, expires_at: expiresAt }).select("id,expires_at").single();
      if (error) throw error;
      return json({ ticket: data.id, expires_at: data.expires_at });
    }
    const { data: step, error: stepError } = await service.from("caregiver_onboarding_steps").select("status").eq("id", access.doc.step_id).single();
    if (stepError) throw stepError;
    if (!canArchive(roles, access.caregiver.auth_user_id === user.id, access.doc.uploaded_by === user.id, step.status === "approved")) return json({ error: "An approved file cannot be deleted or replaced." }, 403);
    const { error } = await service.rpc("archive_caregiver_document", { p_document_id: access.doc.id, p_actor_id: user.id });
    if (error) return json({ error: "This file cannot be removed. Refresh and try again." }, 409);
    // Preserve historical files and audit records; removal is an archive, not a deletion.
    return json({ archived: true });
  } catch {
    return json({ error: "Caregiver documents are temporarily unavailable. Please try again." }, 500);
  }
});