import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { AiResponseCard } from "./AiResponseCard";

interface Exception {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  exceptionType: "Missed Clock-In" | "Missed Clock-Out" | "Incomplete Visit";
  client: string;
  caregiver: string;
}

const EVV_SECTIONS = [
  { key: "incident_summary", label: "Incident Summary" },
  { key: "root_cause", label: "Root Cause" },
  { key: "corrective_documentation", label: "Corrective Documentation" },
  { key: "attestation", label: "Attestation" },
];

export function EvvExceptionLog() {
  const { toast } = useToast();
  const [items, setItems] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<Record<string, string> | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("appointments")
        .select("id, start_time, end_time, status, client:client_id(first_name,last_name), caregiver:caregiver_id(first_name,last_name)")
        .lt("end_time", nowIso)
        .in("status", ["scheduled", "confirmed", "in_progress"])
        .order("end_time", { ascending: false })
        .limit(50);

      const mapped: Exception[] = (data || []).map((a: any) => {
        const exceptionType: Exception["exceptionType"] =
          a.status === "in_progress" ? "Missed Clock-Out" :
          a.status === "scheduled" ? "Missed Clock-In" : "Incomplete Visit";
        return {
          id: a.id,
          start_time: a.start_time,
          end_time: a.end_time,
          status: a.status,
          exceptionType,
          client: a.client ? `${a.client.first_name} ${a.client.last_name}` : "Unknown",
          caregiver: a.caregiver ? `${a.caregiver.first_name} ${a.caregiver.last_name}` : "Unknown",
        };
      });
      setItems(mapped);
      setLoading(false);
    })();
  }, []);

  const generateFix = async (item: Exception) => {
    setActiveId(item.id);
    setAiResult(null);
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("call-off-assistant", {
        body: {
          mode: "evv_fix",
          payload: {
            exceptionType: item.exceptionType,
            clientName: item.client,
            caregiverName: item.caregiver,
            scheduledStart: item.start_time,
            scheduledEnd: item.end_time,
            payer: "ARChoices/Medicaid",
          },
        },
      });
      if (error) throw error;
      const result = data.result as Record<string, string>;
      setAiResult(result);
      await supabase.from("evv_corrections").insert({
        appointment_id: item.id,
        exception_type: item.exceptionType,
        ai_note: result,
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const activeItem = items.find((i) => i.id === activeId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          EVV Exception Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">No EVV exceptions found. 🎉</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Caregiver</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Exception</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{format(new Date(item.start_time), "MMM d, yyyy")}</TableCell>
                  <TableCell>{item.client}</TableCell>
                  <TableCell>{item.caregiver}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(item.start_time), "h:mm a")} - {format(new Date(item.end_time), "h:mm a")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-warning text-warning">{item.exceptionType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="secondary" onClick={() => generateFix(item)}>
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI Fix Note
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!activeId} onOpenChange={(o) => { if (!o) { setActiveId(null); setAiResult(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              EVV Correction Note — {activeItem?.client}
            </DialogTitle>
          </DialogHeader>
          {aiLoading ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating compliance note...</p>
            </div>
          ) : (
            <AiResponseCard title="Authenticare / ARChoices Correction" result={aiResult} sections={EVV_SECTIONS} />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
