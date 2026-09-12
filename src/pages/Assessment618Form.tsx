import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  signer_type: string;
  signer_name: string;
  signer_relationship: string | null;
  signature_data: string;
  attestation_text: string;
  signed_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

const ATTESTATIONS: Record<SignerType, string> = {
  nurse:
    "I certify that I personally performed this 618 assessment, that the information recorded is accurate and complete to the best of my knowledge, and that I am the licensed nurse identified on this record.",
  client:
    "I confirm that this assessment visit took place, that the information the nurse reviewed with me is accurate to the best of my knowledge, and that my services and plan of care were explained to me.",
  representative:
    "I confirm that I am authorized to act on this client's behalf, that this assessment visit took place, and that the information reviewed is accurate to the best of my knowledge.",
  witness:
    "I witnessed this assessment visit and I confirm that the client was unable to sign or declined to sign, and that the reason recorded on this form is accurate.",
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
  const [nurseDialogOpen, setNurseDialogOpen] = useState(false);
  const [altDialogOpen, setAltDialogOpen] = useState<null | "representative" | "witness">(null);
  const [kioskOpen, setKioskOpen] = useState(false);
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
    const map: Partial<Record<SignerType, SignatureRow>> = {};
    for (const s of signatures) map[s.signer_type as SignerType] = s;
    return map;
  }, [signatures]);

  const isDraft = form?.status === "draft";
  const exception = ["unable_physical", "unable_cognitive", "refused"].includes(
    form?.client_signature_status ?? "",
  );
  const clientSideCovered = exception
    ? !!(signed.representative || signed.witness) && !!form?.client_signature_exception_reason?.trim()
    : !!signed.client;
  const readyToLock = !!signed.nurse && clientSideCovered;

  async function addSignature(type: SignerType, result: SignatureResult) {
    if (!form) return false;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("add_618_signature", {
        p_form_id: form.id,
        p_signer_type: type,
        p_signer_name: result.signer_name,
        p_signature_data: result.signature_data,
        p_attestation_text: result.attestation_text,
        p_relationship: result.relationship,
        p_role_description: null,
      });
      if (error) throw error;

      if (type !== "nurse") {
        const status =
          type === "client"
            ? "client_signed"
            : type === "representative"
              ? "representative_signed"
              : "witness_signed";
        if (type === "client") {
          await supabase
            .from("assessment_618_forms")
            .update({ client_signature_status: status })
            .eq("id", form.id);
        }
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

  async function updateException(status: string, reason?: string) {
    if (!form) return;
    const { error } = await supabase
      .from("assessment_618_forms")
      .update({
        client_signature_status: status,
        client_signature_exception_reason: reason ?? form.client_signature_exception_reason,
      })
      .eq("id", form.id);
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

  function signatureRow(type: SignerType, label: string) {
    const sig = signed[type];
    return (
      <div key={type} className="flex items-start gap-3 py-3 border-t first:border-t-0">
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
              </p>
              <p>Signed {formatStamp(sig.signed_at)}</p>
              <p className="break-words">
                Device {sig.user_agent ? sig.user_agent.slice(0, 60) : "not recorded"}
                {sig.ip_address ? ` · IP ${sig.ip_address}` : ""}
              </p>
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
                    <div>
                      {signatureRow("nurse", "Nurse")}
                      {signatureRow("client", "Client")}
                      {signed.representative && signatureRow("representative", "Client representative")}
                      {signed.witness && signatureRow("witness", "Witness")}
                    </div>

                    {isDraft && (
                      <div className="space-y-4 pt-2">
                        {!signed.nurse && (
                          <Button
                            className="w-full min-h-[44px]"
                            variant="outline"
                            onClick={() => setNurseDialogOpen(true)}
                          >
                            Sign as the nurse
                          </Button>
                        )}

                        {!signed.client && (
                          <div className="rounded-lg border p-4 space-y-3">
                            <Label>Client signature</Label>
                            <Select
                              value={
                                exception ? form.client_signature_status : "pending"
                              }
                              onValueChange={(v) => void updateException(v, v === "pending" ? "" : undefined)}
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
                                      void updateException(form.client_signature_status, e.target.value)
                                    }
                                    placeholder="Describe what you observed and what you offered the client."
                                  />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                  <Button
                                    variant="outline"
                                    className="min-h-[44px] flex-1"
                                    onClick={() => setAltDialogOpen("representative")}
                                  >
                                    Representative signs instead
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="min-h-[44px] flex-1"
                                    onClick={() => setAltDialogOpen("witness")}
                                  >
                                    Witness signs instead
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button className="w-full min-h-[44px]" onClick={() => setKioskOpen(true)}>
                                <Smartphone className="w-4 h-4 mr-2" />
                                Hand device to the client to sign
                              </Button>
                            )}
                          </div>
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

      {/* Nurse signature */}
      <Dialog open={nurseDialogOpen} onOpenChange={setNurseDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nurse signature</DialogTitle>
            <DialogDescription>Sign to certify this 618 assessment.</DialogDescription>
          </DialogHeader>
          <SignatureCapture
            attestation={ATTESTATIONS.nurse}
            submitLabel="Sign as the nurse"
            saving={busy}
            onCancel={() => setNurseDialogOpen(false)}
            onSubmit={async (result) => {
              const ok = await addSignature("nurse", result);
              if (ok) setNurseDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Representative / witness signature */}
      <Dialog open={!!altDialogOpen} onOpenChange={(o) => !o && setAltDialogOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {altDialogOpen === "witness" ? "Witness signature" : "Representative signature"}
            </DialogTitle>
            <DialogDescription>
              Hand the device to the person signing. Their name, role and device are recorded.
            </DialogDescription>
          </DialogHeader>
          {altDialogOpen && (
            <SignatureCapture
              attestation={ATTESTATIONS[altDialogOpen]}
              askRelationship
              submitLabel="Submit signature"
              saving={busy}
              onCancel={() => setAltDialogOpen(null)}
              onSubmit={async (result) => {
                const ok = await addSignature(altDialogOpen, result);
                if (ok) setAltDialogOpen(null);
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

      {kioskOpen && form && (
        <ClientSigningMode
          clientName={clientName || "this client"}
          attestation={ATTESTATIONS.client}
          heading="Please sign your assessment"
          instructions="Your nurse has handed you this device. Read the statement, type your name and sign below. Nothing else on this device can be opened until you are finished."
          nurseEmail={user?.email ?? ""}
          saving={busy}
          onSubmit={(result) => addSignature("client", result)}
          onExit={() => setKioskOpen(false)}
        />
      )}
    </div>
  );
}
