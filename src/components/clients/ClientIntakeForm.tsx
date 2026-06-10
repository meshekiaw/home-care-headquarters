import { useState } from "react";
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
import { Loader2, Sparkles, Download } from "lucide-react";
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

export default function ClientIntakeForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, string> | null>(null);
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
          </form>
        </CardContent>
      </Card>

      <AiResponseCard title="AI Intake Packet" result={result} sections={SECTIONS} />
    </div>
  );
}
