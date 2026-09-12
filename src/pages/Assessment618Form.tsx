import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "lucide-react";

type SignerType = "nurse" | "client" | "representative" | "witness" | "physician";

type SignatureSlot =
  | "sec4_client"
  | "sec4_witness_1"
  | "sec4_witness_2"
  | "sec11_nurse"
  | "sec13_physician"
  | "sec13_client";

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
  client_signs_by_mark: boolean;
  signed_at: string | null;
  last_autosaved_at: string | null;
  updated_at: string;
}

interface SignatureRow {
  id: string;
  signature_slot: string | null;
  signer_type: string;
  signer_name: string;
  signer_relationship: string | null;
  signer_role_description: string | null;
  signature_data: string;
  attestation_text: string;
  signed_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

/**
 * Every signature slot on the DMS-618. Each slot carries its own section,
 * its own attestation wording per signing role, and its own audit record.
 */
const SLOTS: {
  slot: SignatureSlot;
  section: string;
  label: string;
  required: "always" | "if_mark" | "optional";
  attestation: Partial<Record<SignerType, string>>;
}[] = [
  {
    slot: "sec4_client",
    section: "Section IV",
    label: "Client or client's representative — Freedom of Choice",
    required: "always",
    attestation: {
      client:
        "Section IV — Freedom of Choice: I have been informed of my right to choose my provider of services, the choices available to me, and I freely choose the provider named on this form. I understand I may change providers at any time.",
      representative:
        "Section IV — Freedom of Choice: I am authorized to act on this client's behalf. The client's right to choose a provider of services and the choices available were explained to me, and on the client's behalf I freely choose the provider named on this form.",
      witness:
        "Section IV — Freedom of Choice: I witnessed that the client's right to choose a provider was explained, that the client was unable or declined to sign for the reason recorded on this form, and that the choice recorded reflects the client's wishes.",
    },
  },
  {
    slot: "sec4_witness_1",
    section: "Section IV",
    label: "Witness 1 — required only if the client signs by mark",
    required: "if_mark",
    attestation: {
      witness:
        "Section IV — Witness to signature by mark: I witnessed the client make their mark on this form as their signature, after the contents of Section IV were read and explained to the client in my presence.",
    },
  },
  {
    slot: "sec4_witness_2",
    section: "Section IV",
    label: "Witness 2 — required only if the client signs by mark",
    required: "if_mark",
    attestation: {
      witness:
        "Section IV — Witness to signature by mark: I witnessed the client make their mark on this form as their signature, after the contents of Section IV were read and explained to the client in my presence.",
    },
  },
  {
    slot: "sec11_nurse",
    section: "Section XI",
    label: "Registered Nurse — Certification of Service Need and Duration",
    required: "always",
    attestation: {
      nurse:
        "Section XI — Certification of Service Need and Duration: I am a registered nurse licensed in this state. I personally performed this assessment, and I certify that the services, amount, frequency and duration recorded here are medically necessary and appropriate for this client based on my assessment findings.",
    },
  },
  {
    slot: "sec13_physician",
    section: "Section XIII",
    label: "Attending physician (optional — not required)",
    required: "optional",
    attestation: {
      physician:
        "Section XIII — Attending physician: I am the attending physician for this client. I have reviewed the authorized service plan recorded on this form and I concur with the services, amount, frequency and duration set out in it.",
    },
  },
  {
    slot: "sec13_client",
    section: "Section XIII",
    label: "Client or client's representative — Acceptance of Authorized Service Plan",
    required: "always",
    attestation: {
      client:
        "Section XIII — Acceptance of Authorized Service Plan: The authorized service plan, including the services to be provided, how often they will be provided and for how long, was reviewed with me. I accept this plan of care and I understand I may request a change or a review of it at any time.",
      representative:
        "Section XIII — Acceptance of Authorized Service Plan: I am authorized to act on this client's behalf. The authorized service plan, including the services, their frequency and duration, was reviewed with me and on the client's behalf I accept this plan of care.",
      witness:
        "Section XIII — Acceptance of Authorized Service Plan: I witnessed the authorized service plan being reviewed with the client, that the client was unable or declined to sign for the reason recorded on this form, and that the client voiced acceptance of the plan.",
    },
  },
];

const SLOT_BY_ID = Object.fromEntries(SLOTS.map((s) => [s.slot, s])) as Record<
  SignatureSlot,
  (typeof SLOTS)[number]
>;

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

export default function Assessment618Form() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [form, setForm] = useState<FormRow | null>(null);
  const [history, setHistory] = useState<FormRow[]>([]);
  const [signatures, setSignatures] = useState<SignatureRow[]>([]);
  const [notes, setNotes] = useState("");
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">("idle");
  const [busy, setBusy] = useState(false);
  const [dialogSlot, setDialogSlot] = useState<null | { slot: SignatureSlot; signerType: SignerType }>(
    null,
  );
  const [kioskSlot, setKioskSlot] = useState<SignatureSlot | null>(null);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [detail, formRes] = await Promise.all([
      supabase.rpc("nurse_assessment_detail", { p_assessment_id: id }),
      supabase
        .from("assessment_618_forms")
        .select("*")
        .eq("nurse_assessment_id", id)
        .order("version", { ascending: false }),
    ]);

    const row = ((detail.data as any[]) ?? [])[0];
    if (row) setClientName(row.client_name ?? "");

    if (formRes.error) {
      toast({ title: "Could not load the 618 form", description: formRes.error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const rows = (formRes.data as FormRow[]) ?? [];
    const current = rows.find((r) => r.status === "draft") ?? rows[0] ?? null;
    setHistory(rows);
    setForm(current);
    setNotes(current?.form_data?.working_notes ?? "");
    hydrated.current = true;

    if (current) {
      const { data: sigs } = await supabase
        .from("assessment_618_signatures")
        .select("*")
        .eq("form_id", current.id)
        .order("signed_at", { ascending: true });
      setSignatures((sigs as SignatureRow[]) ?? []);
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
      const { data, error } = await supabase.rpc("start_618_form", { p_assessment_id: id! });
      if (error) throw error;
      if (!data) throw new Error("The form could not be started.");
      await load();
      toast({ title: "Draft started", description: "Your work saves automatically as you go." });
    } catch (error: any) {
      toast({ title: "Could not start the form", description: error.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  // Autosave the draft body
  useEffect(() => {
    if (!hydrated.current || !form || form.status !== "draft") return;
    if ((form.form_data?.working_notes ?? "") === notes) return;
    setSavingState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase
        .from("assessment_618_forms")
        .update({
          form_data: { ...(form.form_data ?? {}), working_notes: notes },
          last_autosaved_at: new Date().toISOString(),
        })
        .eq("id", form.id);
      if (error) {
        setSavingState("idle");
        toast({ title: "Autosave failed", description: error.message, variant: "destructive" });
        return;
      }
      setForm((prev) =>
        prev ? { ...prev, form_data: { ...(prev.form_data ?? {}), working_notes: notes } } : prev,
      );
      setSavingState("saved");
    }, 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, form?.id, form?.status]);

  const signed = useMemo(() => {
    const map: Partial<Record<SignatureSlot, SignatureRow>> = {};
    for (const s of signatures) {
      if (s.signature_slot) map[s.signature_slot as SignatureSlot] = s;
    }
    return map;
  }, [signatures]);

  const isDraft = form?.status === "draft";
  const byMark = !!form?.client_signs_by_mark;
  const exception = ["unable_physical", "unable_cognitive", "refused"].includes(
    form?.client_signature_status ?? "",
  );

  // Mirrors the database rule in form_618_signatures_complete()
  const readyToLock = useMemo(() => {
    if (!form) return false;
    if (!signed.sec11_nurse) return false;
    if (exception && !form.client_signature_exception_reason?.trim()) return false;
    for (const slot of ["sec4_client", "sec13_client"] as SignatureSlot[]) {
      const sig = signed[slot];
      if (!sig) return false;
      if (exception && !["representative", "witness"].includes(sig.signer_type)) return false;
      if (!exception && !["client", "representative"].includes(sig.signer_type)) return false;
    }
    if (byMark && !(signed.sec4_witness_1 && signed.sec4_witness_2)) return false;
    return true;
  }, [form, signed, exception, byMark]);

  function attestationFor(slot: SignatureSlot, signerType: SignerType) {
    return SLOT_BY_ID[slot].attestation[signerType] ?? "";
  }

  async function addSignature(slot: SignatureSlot, signerType: SignerType, result: SignatureResult) {
    if (!form) return false;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("add_618_signature", {
        p_form_id: form.id,
        p_signature_slot: slot,
        p_signer_type: signerType,
        p_signer_name: result.signer_name,
        p_signature_data: result.signature_data,
        p_attestation_text: result.attestation_text,
        p_relationship: result.relationship,
        p_role_description: signerType === "physician" ? "Attending physician" : null,
      });
      if (error) throw error;

      if (signerType === "client" && !exception) {
        await supabase
          .from("assessment_618_forms")
          .update({ client_signature_status: "client_signed" })
          .eq("id", form.id);
      }

      await load();
      toast({ title: "Signature saved" });
      return true;
    } catch (error: any) {
      toast({ title: "Could not save the signature", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function updateForm(patch: Record<string, any>) {
    if (!form) return;
    const { error } = await supabase.from("assessment_618_forms").update(patch).eq("id", form.id);
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
      const { data, error } = await supabase.rpc("complete_618_form", { p_form_id: form.id });
      if (error) throw error;
      const res = data as { success: boolean; reason?: string };
      if (!res.success) {
        toast({
          title: "Not ready to complete",
          description:
            res.reason === "signatures_incomplete"
              ? "Every required signature must be captured first."
              : res.reason === "not_yours"
                ? "This form isn't assigned to you."
                : "This form is already locked.",
          variant: "destructive",
        });
        return;
      }
      await load();
      toast({ title: "618 assessment completed", description: "The record is now locked." });
    } catch (error: any) {
      toast({ title: "Could not complete the form", description: error.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function startCorrection() {
    if (!form || !correctionReason.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("assessment_618_forms").insert({
        user_id: form.user_id,
        nurse_assessment_id: form.nurse_assessment_id,
        client_id: form.client_id,
        nurse_id: form.nurse_id,
        amends_form_id: form.id,
        amendment_reason: correctionReason.trim(),
        form_data: form.form_data ?? {},
      });
      if (error) throw error;
      setCorrectionOpen(false);
      setCorrectionReason("");
      await load();
      toast({ title: "Correction started", description: "The original record stays on file unchanged." });
    } catch (error: any) {
      toast({ title: "Could not start the correction", description: error.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  function signatureRow(slot: SignatureSlot) {
    const meta = SLOT_BY_ID[slot];
    const sig = signed[slot];
    return (
      <div key={slot} className="flex items-start gap-3 py-3 border-t first:border-t-0">
        {sig ? (
          <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
        ) : (
          <CircleDashed className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{meta.section}</p>
          <p className="font-medium">{meta.label}</p>
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
            <p className="text-sm text-muted-foreground">
              {meta.required === "optional"
                ? "Not signed — optional"
                : meta.required === "if_mark" && !byMark
                  ? "Not needed unless the client signs by mark"
                  : "Not signed yet"}
            </p>
          )}
        </div>
        {sig && <img src={sig.signature_data} alt="" className="h-10 hidden sm:block" />}
      </div>
    );
  }

  const visibleSlots = SLOTS.filter((s) => {
    if (s.required === "if_mark") return byMark || !!signed[s.slot];
    if (s.required === "optional") return isDraft || !!signed[s.slot];
    return true;
  });

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
              <h1 className="text-2xl font-bold">618 Assessment</h1>
              <p className="text-muted-foreground">
                {clientName || "Client"}
                {form ? ` · Version ${form.version}` : ""}
              </p>
            </div>

            {!form ? (
              <Card>
                <CardContent className="py-10 text-center space-y-4">
                  <p className="font-medium">No 618 assessment started for this visit yet.</p>
                  <p className="text-sm text-muted-foreground">
                    Starting one creates a draft that saves automatically while you work.
                  </p>
                  <Button className="min-h-[44px]" onClick={startForm} disabled={busy}>
                    {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Start 618 assessment
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-3">
                      <span>Assessment record</span>
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

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="working_notes">Assessment notes</Label>
                        {isDraft && (
                          <span className="text-xs text-muted-foreground">
                            {savingState === "saving"
                              ? "Saving..."
                              : savingState === "saved"
                                ? "Saved"
                                : form.last_autosaved_at
                                  ? `Last saved ${formatStamp(form.last_autosaved_at)}`
                                  : ""}
                          </span>
                        )}
                      </div>
                      <Textarea
                        id="working_notes"
                        rows={8}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={!isDraft}
                        placeholder="The full 618 question set will appear here. Notes typed now are saved with the record."
                        className="text-base"
                      />
                      <p className="text-xs text-muted-foreground">
                        The complete 618 field set comes next; this record structure, autosave and
                        signing are already in place.
                      </p>
                    </div>

                    {form.content_hash && (
                      <p className="text-xs text-muted-foreground break-all">
                        Document fingerprint: {form.content_hash.slice(0, 32)}…
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Signatures</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>{visibleSlots.map((s) => signatureRow(s.slot))}</div>

                    {isDraft && (
                      <div className="space-y-4 pt-2">
                        {/* Section XI — nurse */}
                        {!signed.sec11_nurse && (
                          <Button
                            className="w-full min-h-[44px]"
                            variant="outline"
                            onClick={() => setDialogSlot({ slot: "sec11_nurse", signerType: "nurse" })}
                          >
                            Sign Section XI as the registered nurse
                          </Button>
                        )}

                        {/* Client / representative slots */}
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
                                    void updateForm({ client_signature_exception_reason: e.target.value })
                                  }
                                  placeholder="Describe what you observed and what you offered the client."
                                />
                              </div>
                              {(["sec4_client", "sec13_client"] as SignatureSlot[]).map((slot) =>
                                signed[slot] ? null : (
                                  <div key={slot} className="flex flex-col sm:flex-row gap-3">
                                    <Button
                                      variant="outline"
                                      className="min-h-[44px] flex-1"
                                      onClick={() => setDialogSlot({ slot, signerType: "representative" })}
                                    >
                                      Representative signs {SLOT_BY_ID[slot].section}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      className="min-h-[44px] flex-1"
                                      onClick={() => setDialogSlot({ slot, signerType: "witness" })}
                                    >
                                      Witness signs {SLOT_BY_ID[slot].section}
                                    </Button>
                                  </div>
                                ),
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  id="by_mark"
                                  checked={byMark}
                                  onCheckedChange={(v) =>
                                    void updateForm({ client_signs_by_mark: v === true })
                                  }
                                  className="mt-0.5"
                                />
                                <Label htmlFor="by_mark" className="text-sm leading-snug">
                                  The client signs by mark (two Section IV witnesses required)
                                </Label>
                              </div>

                              {(["sec4_client", "sec13_client"] as SignatureSlot[]).map((slot) =>
                                signed[slot] ? null : (
                                  <Button
                                    key={slot}
                                    className="w-full min-h-[44px]"
                                    onClick={() => setKioskSlot(slot)}
                                  >
                                    <Smartphone className="w-4 h-4 mr-2" />
                                    Hand device to the client — {SLOT_BY_ID[slot].section}
                                  </Button>
                                ),
                              )}
                            </div>
                          )}
                        </div>

                        {/* Section IV witnesses for signature by mark */}
                        {byMark && (
                          <div className="rounded-lg border p-4 space-y-3">
                            <Label>Section IV witnesses</Label>
                            {(["sec4_witness_1", "sec4_witness_2"] as SignatureSlot[]).map((slot) =>
                              signed[slot] ? null : (
                                <Button
                                  key={slot}
                                  variant="outline"
                                  className="w-full min-h-[44px]"
                                  onClick={() => setDialogSlot({ slot, signerType: "witness" })}
                                >
                                  Capture {slot === "sec4_witness_1" ? "Witness 1" : "Witness 2"}
                                </Button>
                              ),
                            )}
                          </div>
                        )}

                        {/* Section XIII physician — optional */}
                        {!signed.sec13_physician && (
                          <Button
                            variant="ghost"
                            className="w-full min-h-[44px]"
                            onClick={() =>
                              setDialogSlot({ slot: "sec13_physician", signerType: "physician" })
                            }
                          >
                            Add the attending physician's signature (optional)
                          </Button>
                        )}

                        <Button
                          className="w-full min-h-[44px]"
                          disabled={!readyToLock || busy}
                          onClick={lockForm}
                        >
                          {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Complete and lock this assessment
                        </Button>
                        {!readyToLock && (
                          <p className="text-sm text-muted-foreground text-center">
                            Every required signature must be captured before this can be completed.
                          </p>
                        )}
                      </div>
                    )}

                    {form.status === "signed" && (
                      <div className="pt-2 space-y-3">
                        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                          Completed {formatStamp(form.signed_at)} ·{" "}
                          {EXCEPTION_LABELS[form.client_signature_status] ?? form.client_signature_status}
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
                  </CardContent>
                </Card>

                {history.length > 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Version history</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {history.map((h) => (
                        <div key={h.id} className="flex items-center justify-between gap-3 border-t pt-2 first:border-t-0 first:pt-0">
                          <span>
                            Version {h.version} · {h.status}
                          </span>
                          <span className="text-muted-foreground">{formatStamp(h.signed_at ?? h.updated_at)}</span>
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

      {/* Nurse / witness / representative / physician signatures */}
      <Dialog open={!!dialogSlot} onOpenChange={(o) => !o && setDialogSlot(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogSlot ? `${SLOT_BY_ID[dialogSlot.slot].section} — ${dialogSlot.signerType}` : ""}
            </DialogTitle>
            <DialogDescription>
              {dialogSlot ? SLOT_BY_ID[dialogSlot.slot].label : ""}
            </DialogDescription>
          </DialogHeader>
          {dialogSlot && (
            <SignatureCapture
              attestation={attestationFor(dialogSlot.slot, dialogSlot.signerType)}
              askRelationship={dialogSlot.signerType !== "nurse"}
              namePrompt={
                dialogSlot.signerType === "physician" ? "Physician's full name" : "Full legal name"
              }
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

      {/* Correction */}
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

      {kioskSlot && form && (
        <ClientSigningMode
          clientName={clientName || "this client"}
          attestation={attestationFor(kioskSlot, "client")}
          heading={
            kioskSlot === "sec4_client"
              ? "Please sign: your choice of provider"
              : "Please sign: your plan of care"
          }
          instructions="Your nurse has handed you this device. Read the statement, type your name and sign below. Nothing else on this device can be opened until you are finished."
          nurseEmail={user?.email ?? ""}
          saving={busy}
          onSubmit={(result) => addSignature(kioskSlot, "client", result)}
          onExit={() => setKioskSlot(null)}
        />
      )}
    </div>
  );
}
