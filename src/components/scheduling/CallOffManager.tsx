import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AiResponseCard } from "./AiResponseCard";
import { Loader2, Sparkles } from "lucide-react";

const REASONS = ["Illness", "Family Emergency", "Transportation", "No-Show", "Personal", "Other"];
const SERVICE_TYPES = ["Personal Care", "Attendant Care", "Respite", "Companion"];
const PAYERS = ["ARChoices/Medicaid", "DHS Waiver", "Private Pay", "Optum/VA"];
const URGENCIES = ["low", "medium", "high", "critical"];

const SECTIONS = [
  { key: "immediate_actions", label: "Immediate Action Steps" },
  { key: "replacement_strategy", label: "Replacement Strategy" },
  { key: "client_script", label: "Client Phone Script" },
  { key: "caregiver_text", label: "Caregiver Text Message" },
  { key: "axiscare_note", label: "AxisCare Documentation Note" },
  { key: "evv_note", label: "EVV / Authenticare Note" },
];

interface Option { id: string; name: string }

export function CallOffManager() {
  const { toast } = useToast();
  const [caregivers, setCaregivers] = useState<Option[]>([]);
  const [clients, setClients] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, string> | null>(null);

  const [caregiverId, setCaregiverId] = useState("");
  const [clientId, setClientId] = useState("");
  const [reason, setReason] = useState("Illness");
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [shiftTime, setShiftTime] = useState("09:00");
  const [serviceType, setServiceType] = useState("Personal Care");
  const [payer, setPayer] = useState("ARChoices/Medicaid");
  const [urgency, setUrgency] = useState("high");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: cg }, { data: cl }] = await Promise.all([
        supabase.from("caregivers").select("id, first_name, last_name").order("last_name"),
        supabase.from("clients").select("id, first_name, last_name").order("last_name"),
      ]);
      setCaregivers((cg || []).map((c) => ({ id: c.id, name: `${c.first_name} ${c.last_name}` })));
      setClients((cl || []).map((c) => ({ id: c.id, name: `${c.first_name} ${c.last_name}` })));
    })();
  }, []);

  const handleSubmit = async () => {
    if (!caregiverId || !clientId) {
      toast({ title: "Missing info", description: "Select caregiver and client", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const caregiverName = caregivers.find((c) => c.id === caregiverId)?.name || "";
      const clientName = clients.find((c) => c.id === clientId)?.name || "";
      const shiftStart = new Date(`${shiftDate}T${shiftTime}`).toISOString();

      const { data, error } = await supabase.functions.invoke("call-off-assistant", {
        body: {
          mode: "call_off",
          payload: { caregiverName, clientName, reason, shiftStart, serviceType, payer, urgency, notes },
        },
      });
      if (error) throw error;
      const aiResult = data.result as Record<string, string>;
      setResult(aiResult);

      await supabase.from("call_off_events").insert({
        caregiver_id: caregiverId,
        client_id: clientId,
        caregiver_name: caregiverName,
        client_name: clientName,
        reason,
        shift_start: shiftStart,
        service_type: serviceType,
        payer,
        urgency,
        notes,
        ai_response: aiResult,
      });
      toast({ title: "Response generated", description: "AI packet ready below." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Call-Off Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Caregiver who called off</Label>
            <Select value={caregiverId} onValueChange={setCaregiverId}>
              <SelectTrigger><SelectValue placeholder="Select caregiver" /></SelectTrigger>
              <SelectContent>
                {caregivers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Client affected</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Service type</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SERVICE_TYPES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Shift date</Label>
            <Input type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Shift time</Label>
            <Input type="time" value={shiftTime} onChange={(e) => setShiftTime(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Payer / Program</Label>
            <Select value={payer} onValueChange={setPayer}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYERS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Urgency</Label>
            <Select value={urgency} onValueChange={setUrgency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{URGENCIES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Special notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Any additional context the AI should know..." />
          </div>
          <div className="md:col-span-2">
            <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate AI Response
            </Button>
          </div>
        </CardContent>
      </Card>

      <AiResponseCard title="Call-Off Response Packet" result={result} sections={SECTIONS} />
    </div>
  );
}
