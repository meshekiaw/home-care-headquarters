import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface AssessmentRow {
  id: string;
  client_id: string;
  assessment_name: string | null;
  status: string;
  due_date: string;
}

interface CaregiverRow {
  id: string;
  first_name: string;
  last_name: string;
  first_shift_at: string | null;
  orientation_deadline: string | null;
  cleared_to_schedule: boolean | null;
}

export default function NeedsActionNow() {
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [caregivers, setCaregivers] = useState<CaregiverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const { data: aData } = await supabase
        .from("client_assessments")
        .select("id, client_id, assessment_name, status, due_date")
        .neq("status", "completed")
        .not("due_date", "is", null)
        .order("due_date", { ascending: true });

      const { data: cgData } = await supabase
        .from("caregivers")
        .select("id, first_name, last_name, first_shift_at, orientation_deadline, cleared_to_schedule")
        .eq("cleared_to_schedule", false)
        .not("first_shift_at", "is", null)
        .order("first_shift_at", { ascending: true });

      setAssessments((aData as AssessmentRow[]) || []);
      setCaregivers((cgData as CaregiverRow[]) || []);
    } catch (e) {
      console.error("[NeedsActionNow] load failed", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

  function deadlineLabel(due: string) {
    const d = new Date(due).getTime();
    if (Number.isNaN(d)) return { text: "Assessment Pending", urgent: false, show: false };
    const now = Date.now();
    const diff = d - now;
    // Overdue: deadline is in the past (diff < 0, inclusive of exactly now handled below)
    if (diff < 0) return { text: "Assessment Overdue", urgent: true, show: true };
    // Due Soon: deadline is now or within the next 12 hours
    if (diff <= TWELVE_HOURS_MS) return { text: "Assessment Due Soon", urgent: true, show: true };
    return { text: "Assessment Pending", urgent: false, show: false };
  }

  async function markScheduled(id: string) {
    const { error } = await supabase
      .from("client_assessments")
      .update({ status: "scheduled" })
      .eq("id", id);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Marked as scheduled" });
    setAssessments((prev) => prev.filter((a) => a.id !== id));
  }

  function sendReminder(cg: CaregiverRow) {
    toast({
      title: "Reminder sent",
      description: `Orientation reminder queued for ${cg.first_name} ${cg.last_name}.`,
    });
  }

  const nothing = !loading && assessments.length === 0 && caregivers.length === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BellRing className="w-5 h-5 text-primary" />
          Needs Action Now
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {nothing && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/30">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <p className="text-sm font-medium text-success">All clear — no items need action right now.</p>
          </div>
        )}

        {assessments.map((a) => {
          const label = deadlineLabel(a.due_date);
          return (
            <div
              key={a.id}
              className="flex items-start justify-between gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive">{label.text}</p>
                  <p className="text-sm font-medium mt-0.5">
                    {a.assessment_name || "Assessment"} · Client {a.client_id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Status: {a.status} · Due {format(new Date(a.due_date), "PP")} (
                    {formatDistanceToNow(new Date(a.due_date), { addSuffix: true })})
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => markScheduled(a.id)}>
                Mark Scheduled
              </Button>
            </div>
          );
        })}

        {caregivers.map((cg) => (
          <div
            key={cg.id}
            className="flex items-start justify-between gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-warning">Not Cleared</p>
                <p className="text-sm font-medium mt-0.5">
                  {cg.first_name} {cg.last_name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  First shift: {cg.first_shift_at ? format(new Date(cg.first_shift_at), "PPp") : "—"}
                  {cg.orientation_deadline
                    ? ` · Orientation due ${format(new Date(cg.orientation_deadline), "PP")}`
                    : ""}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => sendReminder(cg)}>
              Send Reminder
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
