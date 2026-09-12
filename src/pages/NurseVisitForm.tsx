import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import LegalFooter from "@/components/layout/LegalFooter";
import { SignatureCapture, type SignatureResult } from "@/components/assessments/SignatureCapture";
import { ClientSigningMode } from "@/components/assessments/ClientSigningMode";
import {
  ClipboardCheck,
  Loader2,
  Lock,
  CheckCircle2,
  CircleDashed,
  Smartphone,
  FilePlus2,
  Plus,
  Trash2,
} from "lucide-react";

type Slot = "client" | "nurse";
type SignerType = "nurse" | "client" | "representative" | "witness";

interface FormRow {
  id: string;
  user_id: string;
  nurse_assessment_id: string;
  client_id: string;
  nurse_id: string | null;
  status: string;
  version: number;
  amends_form_id: string | null;
  amendment_reason: string | null;
  form_data: any;
  content_hash: string | null;
  client_signature_status: string;
  client_signature_exception_reason: string | null;
  signed_at: string | null;
  last_autosaved_at: string | null;
  updated_at: string;
}

interface SignatureRow {
  id: string;
  signature_slot: string;
  signer_type: string;
  signer_name: string;
  signer_relationship: string | null;
  signature_data: string;
  attestation_text: string;
  signed_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

interface Hospitalization {
  admit_date: string;
  admit_time: string;
  hospital: string;
  discharge_date: string;
  discharge_time: string;
}

interface FormData {
  client_name: string;
  visit_date: string;
  caregiver_name: string;
  caregiver_present: string;
  service_types: string[];
  mobility: string[];
  mobility_devices: string[];
  client_responses: Record<string, string>;
  caregiver_performance: Record<string, string>;
  hospitalized: string;
  hospitalizations: Hospitalization[];
  service_plan: Record<string, string>;
  comments: string;
}

const EMPTY: FormData = {
  client_name: "",
  visit_date: "",
  caregiver_name: "",
  caregiver_present: "",
  service_types: [],
  mobility: [],
  mobility_devices: [],
  client_responses: {},
  caregiver_performance: {},
  hospitalized: "",
  hospitalizations: [],
  service_plan: {},
  comments: "",
};

const SERVICE_TYPES = ["PC", "AR Choice", "VA", "RS", "Private Insurance", "Private Pay"];

const MOBILITY = [
  { key: "walks_independently", label: "Walks independently" },
  { key: "walks_with_help", label: "Walks with help" },
  { key: "walks_with_device", label: "Walks with device" },
  { key: "transfers_independently", label: "Transfers independently" },
  { key: "transfers_with_help", label: "Transfers with help" },
  { key: "confined_to_chair_or_bed", label: "Confined to chair or bed" },
];

const DEVICES = [
  { key: "walker", label: "Walker" },
  { key: "cane", label: "Cane" },
  { key: "wheelchair", label: "Wheelchair" },
];

const CLIENT_RESPONSES = [
  { key: "pleased_with_care", label: "Client pleased with care provided by aide(s)" },
  { key: "follows_service_plan", label: "Caregiver(s) follows service plan" },
  {
    key: "conduct_and_schedule",
    label: "Caregiver(s) arrives on time, works assigned schedule, displays appropriate conduct",
  },
];

const PERFORMANCE = [
  { key: "performs_tasks", label: "Performs task as assigned" },
  { key: "relates_well", label: "Relates well with Client/Family" },
  { key: "caring_and_sympathetic", label: "Caring and sympathetic to the client's needs" },
];

const SERVICE_PLAN = [
  { key: "plan_adequate", label: "Service Plan is adequate?" },
  { key: "needs_changes", label: "Client need Service Plan changes?" },
  { key: "needs_copy", label: "Client need Service Plan copy?" },
];

const EMPTY_HOSP: Hospitalization = {
  admit_date: "",
  admit_time: "",
  hospital: "",
  discharge_date: "",
  discharge_time: "",
};

const ATTESTATIONS: Record<Slot, Partial<Record<SignerType, string>>> = {
  client: {
    client:
      "Nurse Visit — Client signature: This supervisory nurse visit was conducted with me. The responses recorded about my care, my caregiver and my service plan reflect what I reported, and the contents of this form were reviewed with me.",
    representative:
      "Nurse Visit — Client's representative: I am authorized to act on this client's behalf. This supervisory nurse visit was conducted in my presence and the responses recorded on this form reflect what was reported on the client's behalf.",
    witness:
      "Nurse Visit — Witness: I witnessed this supervisory nurse visit and the review of this form with the client, and that the client was unable or declined to sign for the reason recorded on this form.",
  },
  nurse: {
    nurse:
      "Nurse Visit — Registered Nurse signature: I am a registered nurse licensed in this state. I personally conducted this supervisory visit, and I certify that the observations, client responses and caregiver performance recorded on this form are true and accurate as of the date of the visit.",
  },
};

const EXCEPTION_OPTIONS = [
  { value: "pending", label: "The client will sign" },
  { value: "unable_physical", label: "Client physically unable to sign" },
  { value: "unable_cognitive", label: "Client cognitively unable to sign" },
  { value: "refused", label: "Client declined to sign" },
];

const EXCEPTION_LABELS: Record<string, string> = {
  unable_physical: "Client physically unable to sign",
  unable_cognitive: "Client cognitively unable to sign",
  refused: "Client declined to sign",
  client_signed: "Signed by the client",
  representative_signed: "Signed by a representative",
  witness_signed: "Signed by a witness",
  pending: "Awaiting the client's signature",
};

function formatStamp(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function hydrate(raw: any): FormData {
  return {
    ...EMPTY,
    ...(raw ?? {}),
    service_types: Array.isArray(raw?.service_types) ? raw.service_types : [],
    mobility: Array.isArray(raw?.mobility) ? raw.mobility : [],
    mobility_devices: Array.isArray(raw?.mobility_devices) ? raw.mobility_devices : [],
    client_responses: raw?.client_responses ?? {},
    caregiver_performance: raw?.caregiver_performance ?? {},
    service_plan: raw?.service_plan ?? {},
    hospitalizations: Array.isArray(raw?.hospitalizations) ? raw.hospitalizations : [],
    comments: raw?.comments ?? "",
  };
}

/** Mirrors nurse_visit_form_problems() in the database. */
function findProblems(d: FormData): string[] {
  const problems: string[] = [];
  if (!d.client_name.trim()) problems.push("Client name is required.");
  if (!d.visit_date.trim()) problems.push("Date is required.");
  if (!d.caregiver_name.trim()) problems.push("Caregiver name is required.");
  if (!["Yes", "No"].includes(d.caregiver_present))
    problems.push("Answer whether the caregiver was present.");
  if (d.service_types.length === 0) problems.push("Check at least one type of service.");
  if (d.mobility.length === 0) problems.push("Check at least one mobility level.");
  if (d.mobility.includes("walks_with_device") && d.mobility_devices.length === 0)
    problems.push("Select which device the client walks with.");
  if (CLIENT_RESPONSES.some((q) => !["Yes", "No", "N/A"].includes(d.client_responses[q.key] ?? "")))
    problems.push("Answer every client response to service.");
  if (PERFORMANCE.some((q) => !["Yes", "No", "N/A"].includes(d.caregiver_performance[q.key] ?? "")))
    problems.push("Answer every caregiver performance item.");
  if (!["Yes", "No"].includes(d.hospitalized))
    problems.push("Answer whether the client has been hospitalized since the previous visit.");
  if (d.hospitalized === "Yes") {
    if (d.hospitalizations.length === 0) problems.push("Add at least one hospitalization.");
    else if (
      d.hospitalizations.some(
        (h) =>
          !h.admit_date.trim() ||
          !h.admit_time.trim() ||
          !h.hospital.trim() ||
          !h.discharge_date.trim() ||
          !h.discharge_time.trim(),
      )
    )
      problems.push("Fill in every hospitalization row completely.");
  }
  if (SERVICE_PLAN.some((q) => !["Yes", "No"].includes(d.service_plan[q.key] ?? "")))
    problems.push("Answer every service plan question.");
  if (!d.comments.trim())
    problems.push("Assistive devices / comments / further instructions is required.");

  const anyNo =
    d.caregiver_present === "No" ||
    Object.values(d.client_responses).includes("No") ||
    Object.values(d.caregiver_performance).includes("No") ||
    Object.values(d.service_plan).includes("No");
  if (anyNo && d.comments.trim().length < 10)
    problems.push(
      'A "No" answer was recorded, so it must be documented in the comments before the form can be completed.',
    );
  return problems;
}

export default function NurseVisitForm() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [form, setForm] = useState<FormRow | null>(null);
  const [history, setHistory] = useState<FormRow[]>([]);
  const [signatures, setSignatures] = useState<SignatureRow[]>([]);
  const [data, setData] = useState<FormData>(EMPTY);
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">("idle");
  const [busy, setBusy] = useState(false);
  const [dialogSlot, setDialogSlot] = useState<null | { slot: Slot; signerType: SignerType }>(null);
  const [kiosk, setKiosk] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [detail, formRes] = await Promise.all([
      supabase.rpc("nurse_assessment_detail", { p_assessment_id: id }),
      supabase
        .from("nurse_visit_forms")
        .select("*")
        .eq("nurse_assessment_id", id)
        .order("version", { ascending: false }),
    ]);

    const row = ((detail.data as any[]) ?? [])[0];
    if (row) setClientName(row.client_name ?? "");

    if (formRes.error) {
      toast({
        title: "Could not load the Nurse Visit form",
        description: formRes.error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const rows = (formRes.data as unknown as FormRow[]) ?? [];
    const current = rows.find((r) => r.status === "draft") ?? rows[0] ?? null;
    setHistory(rows);
    setForm(current);
    setData(hydrate(current?.form_data));
    hydrated.current = true;

    if (current) {
      const { data: sigs } = await supabase
        .from("nurse_visit_signatures")
        .select("*")
        .eq("form_id", current.id)
        .order("signed_at", { ascending: true });
      setSignatures((sigs as unknown as SignatureRow[]) ?? []);
    } else {
      setSignatures([]);
    }
    setLoading(false);
  }, [id, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function startForm() {
    setBusy(true);
    try {
      const { data: newId, error } = await supabase.rpc("start_nurse_visit_form", {
        p_assessment_id: id!,
      });
      if (error) throw error;
      if (!newId) throw new Error("The form could not be started.");
      await load();
      toast({ title: "Draft started", description: "Your work saves automatically as you go." });
    } catch (error: any) {
      toast({ title: "Could not start the form", description: error.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const isDraft = form?.status === "draft";

  // Autosave the whole form body
  useEffect(() => {
    if (!hydrated.current || !form || form.status !== "draft") return;
    if (JSON.stringify(hydrate(form.form_data)) === JSON.stringify(data)) return;
    setSavingState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const snapshot = data;
      const { error } = await supabase
        .from("nurse_visit_forms")
        .update({
          form_data: snapshot as any,
          last_autosaved_at: new Date().toISOString(),
        })
        .eq("id", form.id);
      if (error) {
        setSavingState("idle");
        toast({ title: "Autosave failed", description: error.message, variant: "destructive" });
        return;
      }
      setForm((prev) => (prev ? { ...prev, form_data: snapshot } : prev));
      setSavingState("saved");
    }, 1000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, form?.id, form?.status]);

  const signed = useMemo(() => {
    const map: Partial<Record<Slot, SignatureRow>> = {};
    for (const s of signatures) map[s.signature_slot as Slot] = s;
    return map;
  }, [signatures]);

  const exception = ["unable_physical", "unable_cognitive", "refused"].includes(
    form?.client_signature_status ?? "",
  );

  const problems = useMemo(() => findProblems(data), [data]);
  const fieldsComplete = problems.length === 0;

  const readyToLock = useMemo(() => {
    if (!form || !fieldsComplete) return false;
    if (!signed.nurse) return false;
    const clientSig = signed.client;
    if (!clientSig) return false;
    if (exception) {
      if (!form.client_signature_exception_reason?.trim()) return false;
      return ["representative", "witness"].includes(clientSig.signer_type);
    }
    return ["client", "representative"].includes(clientSig.signer_type);
  }, [form, signed, exception, fieldsComplete]);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArray(key: "service_types" | "mobility" | "mobility_devices", value: string) {
    setData((prev) => {
      const list = prev[key];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      if (key === "mobility" && value === "walks_with_device" && !next.includes(value)) {
        return { ...prev, mobility: next, mobility_devices: [] };
      }
      return { ...prev, [key]: next };
    });
  }

  function setAnswer(
    group: "client_responses" | "caregiver_performance" | "service_plan",
    key: string,
    value: string,
  ) {
    setData((prev) => ({ ...prev, [group]: { ...prev[group], [key]: value } }));
  }

  function setHosp(index: number, patch: Partial<Hospitalization>) {
    setData((prev) => ({
      ...prev,
      hospitalizations: prev.hospitalizations.map((h, i) => (i === index ? { ...h, ...patch } : h)),
    }));
  }

  async function addSignature(slot: Slot, signerType: SignerType, result: SignatureResult) {
    if (!form) return false;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("add_nurse_visit_signature", {
        p_form_id: form.id,
        p_signature_slot: slot,
        p_signer_type: signerType,
        p_signer_name: result.signer_name,
        p_signature_data: result.signature_data,
        p_attestation_text: result.attestation_text,
        p_relationship: result.relationship,
        p_role_description: null,
      });
      if (error) throw error;

      if (slot === "client" && !exception) {
        await supabase
          .from("nurse_visit_forms")
          .update({
            client_signature_status:
              signerType === "representative" ? "representative_signed" : "client_signed",
          })
          .eq("id", form.id);
      }

      await load();
      toast({ title: "Signature saved" });
      return true;
    } catch (error: any) {
      toast({
        title: "Could not save the signature",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function updateForm(patch: Record<string, any>) {
    if (!form) return;
    const { error } = await supabase.from("nurse_visit_forms").update(patch).eq("id", form.id);
    if (error) {
      toast({ title: "Could not save that", description: error.message, variant: "destructive" });
      return;
    }
    await load();
  }

  async function lockForm() {
    if (!form) return;
    setBusy(true);
    try {
      const { data: res, error } = await supabase.rpc("complete_nurse_visit_form", {
        p_form_id: form.id,
      });
      if (error) throw error;
      const out = res as { success: boolean; reason?: string; problems?: string[] };
      if (!out.success) {
        toast({
          title: "Not ready to complete",
          description:
            out.reason === "fields_incomplete"
              ? (out.problems ?? []).join(" ")
              : out.reason === "signatures_incomplete"
                ? "Both signatures must be captured first."
                : out.reason === "not_yours"
                  ? "This form isn't assigned to you."
                  : "This form is already locked.",
          variant: "destructive",
        });
        return;
      }
      await load();
      toast({ title: "Nurse Visit completed", description: "The record is now locked." });
    } catch (error: any) {
      toast({
        title: "Could not complete the form",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function startCorrection() {
    if (!form || !correctionReason.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("nurse_visit_forms").insert({
        user_id: form.user_id,
        nurse_assessment_id: form.nurse_assessment_id,
        client_id: form.client_id,
        nurse_id: form.nurse_id,
        amends_form_id: form.id,
        amendment_reason: correctionReason.trim(),
        form_data: (form.form_data ?? {}) as any,
      });
      if (error) throw error;
      setCorrectionOpen(false);
      setCorrectionReason("");
      await load();
      toast({
        title: "Correction started",
        description: "The original record stays on file unchanged.",
      });
    } catch (error: any) {
      toast({
        title: "Could not start the correction",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  function ynGroup(
    group: "client_responses" | "caregiver_performance" | "service_plan",
    items: { key: string; label: string }[],
    options: string[],
  ) {
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.key} className="space-y-2 border-t pt-3 first:border-t-0 first:pt-0">
            <Label className="text-sm leading-snug">{item.label} *</Label>
            <RadioGroup
              className="flex flex-wrap gap-4"
              value={data[group][item.key] ?? ""}
              onValueChange={(v) => setAnswer(group, item.key, v)}
              disabled={!isDraft}
            >
              {options.map((opt) => (
                <div key={opt} className="flex items-center gap-2">
                  <RadioGroupItem value={opt} id={`${group}_${item.key}_${opt}`} />
                  <Label htmlFor={`${group}_${item.key}_${opt}`} className="font-normal">
                    {opt}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
      </div>
    );
  }

  function signatureRow(slot: Slot, label: string) {
    const sig = signed[slot];
    return (
      <div className="flex items-start gap-3 py-3 border-t first:border-t-0">
        {sig ? (
          <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
        ) : (
          <CircleDashed className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium">{label}</p>
          {sig ? (
            <div className="text-sm text-muted-foreground space-y-0.5">
              <p>
                {sig.signer_name}
                {sig.signer_relationship ? ` — ${sig.signer_relationship}` : ""}
                {` (${sig.signer_type})`}
              </p>
              <p>Signed {formatStamp(sig.signed_at)}</p>
              <p className="break-words">
                Device {sig.user_agent ? sig.user_agent.slice(0, 60) : "not recorded"}
                {sig.ip_address ? ` · IP ${sig.ip_address}` : ""}
              </p>
              <p className="break-words italic">“{sig.attestation_text}”</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not signed yet</p>
          )}
        </div>
        {sig && <img src={sig.signature_data} alt="" className="h-10 hidden sm:block" />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          <span className="font-semibold">Home Care Headquarters</span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 space-y-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">Nurse Visit Form</h1>
              <p className="text-muted-foreground">
                {clientName || "Client"}
                {form ? ` · Version ${form.version}` : ""} · Revised 03/21
              </p>
            </div>

            {!form ? (
              <Card>
                <CardContent className="py-10 text-center space-y-4">
                  <p className="font-medium">No Nurse Visit form started for this visit yet.</p>
                  <p className="text-sm text-muted-foreground">
                    Starting one creates a draft that saves automatically while you work.
                  </p>
                  <Button className="min-h-[44px]" onClick={startForm} disabled={busy}>
                    {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Start Nurse Visit form
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-3">
                      <span>Visit information</span>
                      {isDraft ? (
                        <Badge variant="secondary">Draft</Badge>
                      ) : form.status === "amended" ? (
                        <Badge variant="outline">Superseded</Badge>
                      ) : (
                        <Badge className="bg-success text-success-foreground">
                          <Lock className="w-3 h-3 mr-1" /> Signed &amp; locked
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {form.amendment_reason && (
                      <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                        <span className="font-medium">Correction reason: </span>
                        {form.amendment_reason}
                      </div>
                    )}

                    {isDraft && (
                      <p className="text-xs text-muted-foreground text-right">
                        {savingState === "saving"
                          ? "Saving..."
                          : savingState === "saved"
                            ? "Saved"
                            : form.last_autosaved_at
                              ? `Last saved ${formatStamp(form.last_autosaved_at)}`
                              : ""}
                      </p>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="client_name">Client name *</Label>
                        <Input
                          id="client_name"
                          value={data.client_name}
                          onChange={(e) => set("client_name", e.target.value)}
                          disabled={!isDraft}
                          className="min-h-[44px] text-base"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="visit_date">Date *</Label>
                        <Input
                          id="visit_date"
                          type="date"
                          value={data.visit_date}
                          onChange={(e) => set("visit_date", e.target.value)}
                          disabled={!isDraft}
                          className="min-h-[44px] text-base"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="caregiver_name">Caregiver name *</Label>
                        <Input
                          id="caregiver_name"
                          value={data.caregiver_name}
                          onChange={(e) => set("caregiver_name", e.target.value)}
                          disabled={!isDraft}
                          className="min-h-[44px] text-base"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Caregiver present *</Label>
                        <RadioGroup
                          className="flex gap-4 pt-2"
                          value={data.caregiver_present}
                          onValueChange={(v) => set("caregiver_present", v)}
                          disabled={!isDraft}
                        >
                          {["Yes", "No"].map((opt) => (
                            <div key={opt} className="flex items-center gap-2">
                              <RadioGroupItem value={opt} id={`caregiver_present_${opt}`} />
                              <Label htmlFor={`caregiver_present_${opt}`} className="font-normal">
                                {opt}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Type of services</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">Check all that apply *</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {SERVICE_TYPES.map((t) => (
                        <div key={t} className="flex items-center gap-3">
                          <Checkbox
                            id={`service_${t}`}
                            checked={data.service_types.includes(t)}
                            onCheckedChange={() => toggleArray("service_types", t)}
                            disabled={!isDraft}
                          />
                          <Label htmlFor={`service_${t}`} className="font-normal">
                            {t}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Condition of client — mobility level</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">Check all that apply *</p>
                    {MOBILITY.map((m) => (
                      <div key={m.key} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`mob_${m.key}`}
                            checked={data.mobility.includes(m.key)}
                            onCheckedChange={() => toggleArray("mobility", m.key)}
                            disabled={!isDraft}
                          />
                          <Label htmlFor={`mob_${m.key}`} className="font-normal">
                            {m.label}
                          </Label>
                        </div>
                        {m.key === "walks_with_device" && data.mobility.includes("walks_with_device") && (
                          <div className="ml-8 space-y-3 border-l pl-4">
                            {DEVICES.map((d) => (
                              <div key={d.key} className="flex items-center gap-3">
                                <Checkbox
                                  id={`dev_${d.key}`}
                                  checked={data.mobility_devices.includes(d.key)}
                                  onCheckedChange={() => toggleArray("mobility_devices", d.key)}
                                  disabled={!isDraft}
                                />
                                <Label htmlFor={`dev_${d.key}`} className="font-normal">
                                  {d.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Client responses to service</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ynGroup("client_responses", CLIENT_RESPONSES, ["Yes", "No", "N/A"])}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance of caregiver</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ynGroup("caregiver_performance", PERFORMANCE, ["Yes", "No", "N/A"])}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Hospitalization</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm leading-snug">
                        Has client been hospitalized since previous supervisory visit? *
                      </Label>
                      <RadioGroup
                        className="flex gap-4"
                        value={data.hospitalized}
                        onValueChange={(v) =>
                          setData((prev) => ({
                            ...prev,
                            hospitalized: v,
                            hospitalizations:
                              v === "Yes"
                                ? prev.hospitalizations.length
                                  ? prev.hospitalizations
                                  : [{ ...EMPTY_HOSP }]
                                : [],
                          }))
                        }
                        disabled={!isDraft}
                      >
                        {["Yes", "No"].map((opt) => (
                          <div key={opt} className="flex items-center gap-2">
                            <RadioGroupItem value={opt} id={`hosp_${opt}`} />
                            <Label htmlFor={`hosp_${opt}`} className="font-normal">
                              {opt}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    {data.hospitalized === "Yes" && (
                      <div className="space-y-4">
                        {data.hospitalizations.map((h, i) => (
                          <div key={i} className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm">Hospitalization {i + 1}</p>
                              {isDraft && data.hospitalizations.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    set(
                                      "hospitalizations",
                                      data.hospitalizations.filter((_, idx) => idx !== i),
                                    )
                                  }
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Admit date *</Label>
                                <Input
                                  type="date"
                                  value={h.admit_date}
                                  onChange={(e) => setHosp(i, { admit_date: e.target.value })}
                                  disabled={!isDraft}
                                  className="min-h-[44px] text-base"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Admit time *</Label>
                                <Input
                                  type="time"
                                  value={h.admit_time}
                                  onChange={(e) => setHosp(i, { admit_time: e.target.value })}
                                  disabled={!isDraft}
                                  className="min-h-[44px] text-base"
                                />
                              </div>
                              <div className="space-y-2 sm:col-span-2">
                                <Label>Hospital *</Label>
                                <Input
                                  value={h.hospital}
                                  onChange={(e) => setHosp(i, { hospital: e.target.value })}
                                  disabled={!isDraft}
                                  className="min-h-[44px] text-base"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Discharge date *</Label>
                                <Input
                                  type="date"
                                  value={h.discharge_date}
                                  onChange={(e) => setHosp(i, { discharge_date: e.target.value })}
                                  disabled={!isDraft}
                                  className="min-h-[44px] text-base"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Discharge time *</Label>
                                <Input
                                  type="time"
                                  value={h.discharge_time}
                                  onChange={(e) => setHosp(i, { discharge_time: e.target.value })}
                                  disabled={!isDraft}
                                  className="min-h-[44px] text-base"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        {isDraft && (
                          <Button
                            variant="outline"
                            className="w-full min-h-[44px]"
                            onClick={() =>
                              set("hospitalizations", [...data.hospitalizations, { ...EMPTY_HOSP }])
                            }
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add another hospitalization
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Service plan</CardTitle>
                  </CardHeader>
                  <CardContent>{ynGroup("service_plan", SERVICE_PLAN, ["Yes", "No"])}</CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Assistive devices, comments &amp; further instructions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Label htmlFor="comments">
                      Assistive devices or medical equipment in use / comments / further instructions *
                    </Label>
                    <Textarea
                      id="comments"
                      rows={6}
                      value={data.comments}
                      onChange={(e) => set("comments", e.target.value)}
                      disabled={!isDraft}
                      className="text-base"
                      placeholder="Any answer of No must be documented here."
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Signatures</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      {signatureRow("client", "Client signature")}
                      {signatureRow("nurse", "RN signature")}
                    </div>

                    {isDraft && (
                      <div className="space-y-4 pt-2">
                        {!fieldsComplete && (
                          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-1">
                            <p className="text-sm font-medium">
                              Finish these before signing this form:
                            </p>
                            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-0.5">
                              {problems.map((p) => (
                                <li key={p}>{p}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="rounded-lg border p-4 space-y-3">
                          <Label>Client signature</Label>
                          <Select
                            value={exception ? form.client_signature_status : "pending"}
                            onValueChange={(v) =>
                              void updateForm({
                                client_signature_status: v,
                                client_signature_exception_reason:
                                  v === "pending" ? "" : form.client_signature_exception_reason,
                              })
                            }
                          >
                            <SelectTrigger className="min-h-[44px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {EXCEPTION_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {exception ? (
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label htmlFor="exception_reason">
                                  Explain why the client is not signing *
                                </Label>
                                <Textarea
                                  id="exception_reason"
                                  rows={3}
                                  defaultValue={form.client_signature_exception_reason ?? ""}
                                  onBlur={(e) =>
                                    void updateForm({
                                      client_signature_exception_reason: e.target.value,
                                    })
                                  }
                                  placeholder="Describe what you observed and what you offered the client."
                                />
                              </div>
                              {!signed.client && (
                                <div className="flex flex-col sm:flex-row gap-3">
                                  <Button
                                    variant="outline"
                                    className="min-h-[44px] flex-1"
                                    disabled={!fieldsComplete}
                                    onClick={() =>
                                      setDialogSlot({ slot: "client", signerType: "representative" })
                                    }
                                  >
                                    Representative signs
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="min-h-[44px] flex-1"
                                    disabled={!fieldsComplete}
                                    onClick={() =>
                                      setDialogSlot({ slot: "client", signerType: "witness" })
                                    }
                                  >
                                    Witness signs
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : (
                            !signed.client && (
                              <Button
                                className="w-full min-h-[44px]"
                                disabled={!fieldsComplete}
                                onClick={() => setKiosk(true)}
                              >
                                <Smartphone className="w-4 h-4 mr-2" />
                                Hand device to the client to sign
                              </Button>
                            )
                          )}
                        </div>

                        {!signed.nurse && (
                          <Button
                            variant="outline"
                            className="w-full min-h-[44px]"
                            disabled={!fieldsComplete}
                            onClick={() => setDialogSlot({ slot: "nurse", signerType: "nurse" })}
                          >
                            Sign as the registered nurse
                          </Button>
                        )}

                        <Button
                          className="w-full min-h-[44px]"
                          disabled={!readyToLock || busy}
                          onClick={lockForm}
                        >
                          {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Complete and lock this Nurse Visit
                        </Button>
                        {!readyToLock && (
                          <p className="text-sm text-muted-foreground text-center">
                            All required fields and both signatures are needed before this can be
                            completed.
                          </p>
                        )}
                      </div>
                    )}

                    {form.status === "signed" && (
                      <div className="pt-2 space-y-3">
                        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                          Completed {formatStamp(form.signed_at)} ·{" "}
                          {EXCEPTION_LABELS[form.client_signature_status] ??
                            form.client_signature_status}
                          {form.client_signature_exception_reason
                            ? ` — ${form.client_signature_exception_reason}`
                            : ""}
                        </div>
                        <Button
                          variant="outline"
                          className="w-full min-h-[44px]"
                          onClick={() => setCorrectionOpen(true)}
                        >
                          <FilePlus2 className="w-4 h-4 mr-2" />
                          Add a correction
                        </Button>
                      </div>
                    )}

                    {form.content_hash && (
                      <p className="text-xs text-muted-foreground break-all">
                        Document fingerprint: {form.content_hash.slice(0, 32)}…
                      </p>
                    )}
                  </CardContent>
                </Card>

                {history.length > 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Version history</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {history.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between gap-3 border-t pt-2 first:border-t-0 first:pt-0"
                        >
                          <span>
                            Version {h.version} · {h.status}
                          </span>
                          <span className="text-muted-foreground">
                            {formatStamp(h.signed_at ?? h.updated_at)}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            <Button asChild variant="ghost" className="w-full min-h-[44px]">
              <Link to={`/assessments/${id}/claim`}>Back to the assessment</Link>
            </Button>
          </>
        )}
      </main>

      <LegalFooter />

      <Dialog open={!!dialogSlot} onOpenChange={(o) => !o && setDialogSlot(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogSlot?.slot === "nurse" ? "RN signature" : "Client signature"}
            </DialogTitle>
            <DialogDescription>
              {dialogSlot?.signerType === "nurse"
                ? "Registered nurse conducting this supervisory visit"
                : dialogSlot?.signerType === "representative"
                  ? "Client's authorized representative"
                  : "Witness on the client's behalf"}
            </DialogDescription>
          </DialogHeader>
          {dialogSlot && (
            <SignatureCapture
              attestation={ATTESTATIONS[dialogSlot.slot][dialogSlot.signerType] ?? ""}
              askRelationship={dialogSlot.signerType !== "nurse"}
              submitLabel="Submit signature"
              saving={busy}
              onCancel={() => setDialogSlot(null)}
              onSubmit={async (result) => {
                const ok = await addSignature(dialogSlot.slot, dialogSlot.signerType, result);
                if (ok) setDialogSlot(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a correction</DialogTitle>
            <DialogDescription>
              The signed record stays on file exactly as it is. This creates a new version that has to
              be signed again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="correction_reason">Reason for the correction *</Label>
              <Textarea
                id="correction_reason"
                rows={3}
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="What is being corrected and why?"
              />
            </div>
            <Button
              className="w-full min-h-[44px]"
              disabled={busy || correctionReason.trim().length < 3}
              onClick={startCorrection}
            >
              Start the correction
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {kiosk && form && (
        <ClientSigningMode
          clientName={clientName || "this client"}
          attestation={ATTESTATIONS.client.client ?? ""}
          heading="Please sign: your nurse visit"
          instructions="Your nurse has handed you this device. Read the statement, type your name and sign below. Nothing else on this device can be opened until you are finished."
          nurseEmail={user?.email ?? ""}
          saving={busy}
          onSubmit={(result) => addSignature("client", "client", result)}
          onExit={() => setKiosk(false)}
        />
      )}
    </div>
  );
}
