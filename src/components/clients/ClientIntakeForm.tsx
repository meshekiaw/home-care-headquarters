import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Sparkles, Download, Eye, Save } from "lucide-react";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AiResponseCard } from "@/components/scheduling/AiResponseCard";

const SECTIONS = [
  { key: "care_plan", label: "Care Plan Draft" },
  { key: "packet_checklist", label: "JotForm / DocuSign Packet Checklist" },
  { key: "welcome_letter", label: "Welcome Letter" },
  { key: "caregiver_recommendation", label: "Caregiver Assignment Recommendation" },
];

const SERVICE_TYPES = ["Personal Care", "Attendant Care", "Respite", "Companion", "Skilled Nursing"];
const PAYERS = ["ARChoices/Medicaid", "DHS Aged & Disabled Waiver", "Private Pay", "Optum/VA"];

export default function ClientIntakeForm({ onSaved }: { onSaved?: () => void } = {}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [form, setForm] = useState({
    clientName: "",
    address: "",
    dob: "",
    diagnosis: "",
    serviceType: "Personal Care",
    payer: "ARChoices/Medicaid",
    authorizedHours: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    notes: "",
  });

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName.trim()) {
      toast({ title: "Client name required", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("call-off-assistant", {
        body: { mode: "intake", payload: form },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data.result || {});
      toast({ title: "Intake packet generated" });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onSaveClient = async () => {
    if (!form.clientName.trim()) {
      toast({ title: "Client name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) throw new Error("Not signed in");
      const userId = userData.user.id;

      const parts = form.clientName.trim().split(/\s+/);
      const firstName = parts[0];
      const lastName = parts.slice(1).join(" ") || "-";

      const { data: client, error: cErr } = await supabase
        .from("clients")
        .insert({
          user_id: userId,
          first_name: firstName,
          last_name: lastName,
          date_of_birth: form.dob || null,
          address: form.address || null,
          emergency_contact_name: form.emergencyContactName || null,
          emergency_contact_phone: form.emergencyContactPhone || null,
          notes: form.notes || null,
          client_hours: form.authorizedHours ? Number(form.authorizedHours) : null,
        })
        .select("id")
        .single();
      if (cErr) throw cErr;

      const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const dueDate = deadline.toISOString().slice(0, 10);

      const { error: aErr } = await supabase.from("client_assessments").insert({
        user_id: userId,
        client_id: client.id,
        assessment_type: "initial",
        assessment_name: "Initial Home Assessment",
        status: "pending",
        due_date: dueDate,
        assessment_deadline: deadline.toISOString(),
        family_name: form.emergencyContactName || null,
        family_phone: form.emergencyContactPhone || null,
        notes: form.notes || null,
      });
      if (aErr) throw aErr;

      toast({
        title: "Client saved",
        description: "Client saved and assessment created. Check Onboarding Pipeline to track progress.",
      });
      onSaved?.();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const buildPdf = (): jsPDF | null => {
    if (!result) return null;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 54;
    const maxW = pageW - margin * 2;
    let y = margin;
    let pageNum = 0;

    const NAVY: [number, number, number] = [20, 60, 120];
    const LIGHT: [number, number, number] = [235, 240, 250];
    const TEXT: [number, number, number] = [25, 25, 35];
    const MUTED: [number, number, number] = [110, 115, 130];

    const drawFooter = () => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(
        `Home Care Headquarters — Confidential Intake Packet`,
        margin,
        pageH - 24
      );
      doc.text(`Page ${pageNum}`, pageW - margin, pageH - 24, { align: "right" });
    };

    const newPage = () => {
      doc.addPage();
      pageNum += 1;
      y = margin;
      drawFooter();
    };

    const ensureSpace = (h: number) => {
      if (y + h > pageH - margin - 30) newPage();
    };

    // === Cover Page ===
    pageNum = 1;
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 160, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text("Client Intake Packet", margin, 80);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("Home Care Headquarters", margin, 110);
    doc.text(new Date().toLocaleDateString(), margin, 130);

    y = 200;
    doc.setTextColor(...TEXT);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Client Information", margin, y);
    y += 8;
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(1);
    doc.line(margin, y, pageW - margin, y);
    y += 20;

    const infoRows: [string, string][] = [
      ["Client Name", form.clientName || "—"],
      ["Date of Birth", form.dob || "—"],
      ["Address", form.address || "—"],
      ["Primary Diagnosis", form.diagnosis || "—"],
      ["Service Type", form.serviceType || "—"],
      ["Payer / Program", form.payer || "—"],
      ["Authorized Hours", form.authorizedHours || "—"],
      ["Emergency Contact", `${form.emergencyContactName || "—"} ${form.emergencyContactPhone ? "• " + form.emergencyContactPhone : ""}`.trim()],
    ];
    doc.setFontSize(11);
    infoRows.forEach(([k, v]) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...NAVY);
      doc.text(`${k}:`, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEXT);
      const vLines = doc.splitTextToSize(v, maxW - 140);
      doc.text(vLines, margin + 140, y);
      y += 14 * vLines.length + 4;
    });

    if (form.notes) {
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...NAVY);
      doc.text("Special Needs / Notes", margin, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEXT);
      const nLines = doc.splitTextToSize(form.notes, maxW);
      nLines.forEach((line: string) => {
        ensureSpace(14);
        doc.text(line, margin, y);
        y += 14;
      });
    }
    drawFooter();

    // === One section per page ===
    SECTIONS.forEach((s, idx) => {
      newPage();

      // Section header band
      doc.setFillColor(...NAVY);
      doc.rect(0, margin - 30, pageW, 56, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(200, 215, 240);
      doc.text(`SECTION ${idx + 1} OF ${SECTIONS.length}`, margin, margin - 10);
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text(s.label, margin, margin + 14);

      y = margin + 56;

      // Light divider
      doc.setFillColor(...LIGHT);
      doc.rect(margin, y, maxW, 2, "F");
      y += 20;

      const text = (result[s.key] || "").trim() || "(No content returned.)";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...TEXT);

      const paragraphs = text.split(/\n+/);
      paragraphs.forEach((para) => {
        const trimmed = para.trim();
        if (!trimmed) return;

        // Detect bullet/numbered lines
        const isBullet = /^[-*•]\s+/.test(trimmed);
        const isNumbered = /^\d+[.)]\s+/.test(trimmed);
        const isHeading = /^#{1,3}\s+/.test(trimmed) || (/^[A-Z][A-Z0-9 \-/&]{3,}:?$/.test(trimmed) && trimmed.length < 80);

        if (isHeading) {
          ensureSpace(24);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.setTextColor(...NAVY);
          doc.text(trimmed.replace(/^#{1,3}\s+/, ""), margin, y);
          y += 18;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(11);
          doc.setTextColor(...TEXT);
          return;
        }

        const body = isBullet
          ? trimmed.replace(/^[-*•]\s+/, "")
          : isNumbered
          ? trimmed.replace(/^\d+[.)]\s+/, "")
          : trimmed;
        const indent = isBullet || isNumbered ? 18 : 0;
        const prefix = isBullet ? "•  " : isNumbered ? trimmed.match(/^(\d+[.)])\s+/)![1] + "  " : "";

        const lines = doc.splitTextToSize(body, maxW - indent);
        lines.forEach((line: string, i: number) => {
          ensureSpace(15);
          if (i === 0 && prefix) {
            doc.setFont("helvetica", "bold");
            doc.text(prefix, margin, y);
            doc.setFont("helvetica", "normal");
          }
          doc.text(line, margin + indent, y);
          y += 15;
        });
        y += 6;
      });
    });

    return doc;
  };

  const safeName = () => (form.clientName || "client").replace(/[^a-z0-9]+/gi, "_");

  const openPreview = () => {
    if (!result) return;
    setPreviewOpen(true);
  };

  const downloadPdf = () => {
    const doc = buildPdf();
    if (!doc) return;
    doc.save(`intake_packet_${safeName()}.pdf`);
    toast({ title: "PDF downloaded" });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            New Client Intake
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="clientName">Client Name *</Label>
              <Input id="clientName" value={form.clientName} onChange={(e) => update("clientName", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input id="dob" type="date" value={form.dob} onChange={(e) => update("dob", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="authorizedHours">Authorized Hours</Label>
                <Input id="authorizedHours" type="number" value={form.authorizedHours} onChange={(e) => update("authorizedHours", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="diagnosis">Primary Diagnosis</Label>
              <Input id="diagnosis" value={form.diagnosis} onChange={(e) => update("diagnosis", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Service Type</Label>
                <Select value={form.serviceType} onValueChange={(v) => update("serviceType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Payer / Program</Label>
                <Select value={form.payer} onValueChange={(v) => update("payer", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ecName">Emergency Contact Name</Label>
                <Input id="ecName" value={form.emergencyContactName} onChange={(e) => update("emergencyContactName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ecPhone">Emergency Contact Phone</Label>
                <Input id="ecPhone" value={form.emergencyContactPhone} onChange={(e) => update("emergencyContactPhone", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Special Needs / Notes</Label>
              <Textarea id="notes" rows={4} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Intake Packet</>}
            </Button>
            <Button
              type="button"
              onClick={onSaveClient}
              disabled={saving || !form.clientName.trim()}
              variant="secondary"
              className="w-full"
            >
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : <><Save className="w-4 h-4 mr-2" /> Save Client & Create Assessment</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {result && (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={openPreview}>
              <Eye className="w-4 h-4 mr-2" /> Preview PDF
            </Button>
            <Button type="button" variant="secondary" onClick={downloadPdf}>
              <Download className="w-4 h-4 mr-2" /> Download as PDF
            </Button>
          </div>
        )}
        <AiResponseCard title="AI Intake Packet" result={result} sections={SECTIONS} />
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle>Intake Packet Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto bg-muted p-6">
            <div className="mx-auto max-w-3xl bg-white shadow-lg rounded-md overflow-hidden">
              <div className="bg-[rgb(20,60,120)] text-white px-8 py-8">
                <h1 className="text-2xl font-bold">Client Intake Packet</h1>
                <p className="text-sm opacity-90 mt-1">Home Care Headquarters</p>
                <p className="text-xs opacity-80">{new Date().toLocaleDateString()}</p>
              </div>
              <div className="px-8 py-6 border-b">
                <h2 className="font-bold text-[rgb(20,60,120)] border-b border-[rgb(20,60,120)] pb-1 mb-3">
                  Client Information
                </h2>
                <dl className="grid grid-cols-[160px_1fr] gap-y-1.5 text-sm">
                  {([
                    ["Client Name", form.clientName],
                    ["Date of Birth", form.dob],
                    ["Address", form.address],
                    ["Primary Diagnosis", form.diagnosis],
                    ["Service Type", form.serviceType],
                    ["Payer / Program", form.payer],
                    ["Authorized Hours", form.authorizedHours],
                    ["Emergency Contact", `${form.emergencyContactName || ""}${form.emergencyContactPhone ? " • " + form.emergencyContactPhone : ""}`.trim()],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="font-semibold text-[rgb(20,60,120)]">{k}:</dt>
                      <dd className="text-gray-800">{v || "—"}</dd>
                    </div>
                  ))}
                </dl>
                {form.notes && (
                  <div className="mt-4">
                    <h3 className="font-semibold text-[rgb(20,60,120)] mb-1">Special Needs / Notes</h3>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{form.notes}</p>
                  </div>
                )}
              </div>

              {SECTIONS.map((s, idx) => (
                <div key={s.key}>
                  <div className="bg-[rgb(20,60,120)] text-white px-8 py-4">
                    <div className="text-[10px] uppercase tracking-wider text-[rgb(200,215,240)]">
                      Section {idx + 1} of {SECTIONS.length}
                    </div>
                    <h2 className="text-lg font-bold">{s.label}</h2>
                  </div>
                  <div className="px-8 py-5 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed border-b">
                    {(result?.[s.key] || "").trim() || "(No content returned.)"}
                  </div>
                </div>
              ))}

              <div className="px-8 py-3 text-xs text-gray-500 text-center">
                Home Care Headquarters — Confidential Intake Packet
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-3 border-t">
            <Button variant="ghost" onClick={() => setPreviewOpen(false)}>Close</Button>
            <Button onClick={downloadPdf}>
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
