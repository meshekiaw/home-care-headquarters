import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LegalFooter from "@/components/layout/LegalFooter";
import { ClipboardCheck, Loader2, CheckCircle } from "lucide-react";

interface Assessment {
  id: string;
  assessment_type: string;
  due_date: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  assigned_nurse_id: string | null;
  clients: { first_name: string; last_name: string } | null;
  nurses: { first_name: string; last_name: string } | null;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.split("-").map(Number);
  return `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}/${y}`;
}

function formatTime(value: string | null) {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export default function AssessmentClaim() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [claimedMessage, setClaimedMessage] = useState<string | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("nurse_assessments")
      .select(
        "id, assessment_type, due_date, status, scheduled_date, scheduled_time, assigned_nurse_id, clients(first_name,last_name), nurses(first_name,last_name)",
      )
      .eq("id", id!)
      .maybeSingle();

    if (error) {
      toast({ title: "Could not load assessment", description: error.message, variant: "destructive" });
    }
    const row = (data as unknown as Assessment) ?? null;
    setAssessment(row);
    if (row?.assigned_nurse_id) {
      const nurseName = row.nurses
        ? `${row.nurses.first_name} ${row.nurses.last_name}`
        : "another nurse";
      setClaimedMessage(
        `This assessment has already been claimed by ${nurseName} for ${formatDate(row.scheduled_date)} ${formatTime(row.scheduled_time)}`.trim(),
      );
    } else {
      setClaimedMessage(null);
    }
    setLoading(false);
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("claim_nurse_assessment", {
        p_assessment_id: id!,
        p_scheduled_date: scheduledDate,
        p_scheduled_time: scheduledTime,
      });
      if (error) throw error;

      const res = data as {
        success: boolean;
        reason?: string;
        nurse_name?: string;
        scheduled_date?: string | null;
        scheduled_time?: string | null;
      };

      if (res.success) {
        toast({ title: "Assessment claimed", description: "Your visit date and time have been saved." });
        await load();
        return;
      }

      if (res.reason === "already_claimed") {
        setClaimedMessage(
          `This assessment has already been claimed by ${res.nurse_name} for ${formatDate(res.scheduled_date ?? null)} ${formatTime(res.scheduled_time ?? null)}`.trim(),
        );
        await load();
        return;
      }

      if (res.reason === "not_a_nurse") {
        toast({
          title: "Nurse record not found",
          description: "Your sign-in email doesn't match a nurse record. Contact your coordinator.",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Assessment not found", variant: "destructive" });
    } catch (error: any) {
      toast({ title: "Could not claim assessment", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          <span className="font-semibold">Home Care Headquarters</span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !assessment ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <p className="font-medium">This assessment is no longer available.</p>
              <Button asChild variant="outline"><Link to="/login">Back to sign in</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span>{assessment.assessment_type} Assessment</span>
                <Badge variant={assessment.status === "Overdue" ? "destructive" : "secondary"}>
                  {assessment.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">
                    {assessment.clients
                      ? `${assessment.clients.first_name} ${assessment.clients.last_name}`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due date</p>
                  <p className="font-medium">{formatDate(assessment.due_date)}</p>
                </div>
              </div>

              {claimedMessage ? (
                <div className="rounded-lg border bg-muted/50 p-4 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                  <p className="font-medium">{claimedMessage}</p>
                </div>
              ) : (
                <form onSubmit={handleClaim} className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Enter the date and time you will complete this assessment to claim it.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="scheduled_date">Date *</Label>
                      <Input
                        id="scheduled_date"
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduled_time">Time *</Label>
                      <Input
                        id="scheduled_time"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full min-h-[44px]" disabled={saving || !scheduledDate || !scheduledTime}>
                    {saving ? "Claiming..." : "Claim this assessment"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <LegalFooter />
    </div>
  );
}
