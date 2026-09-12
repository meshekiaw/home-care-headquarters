import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LegalFooter from "@/components/layout/LegalFooter";
import { ClipboardCheck, Loader2, CheckCircle } from "lucide-react";

interface AssessmentDetail {
  id: string;
  assessment_type: string;
  due_date: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  notes: string | null;
  client_name: string;
  form_618_expiration_date: string | null;
  is_mine: boolean;
  claimed_by_name: string | null;
  rescheduled_at: string | null;
  reschedule_count: number | null;
  previous_scheduled_date: string | null;
  previous_scheduled_time: string | null;
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
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [notes, setNotes] = useState("");
  const [claimedMessage, setClaimedMessage] = useState<string | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("nurse_assessment_detail", {
      p_assessment_id: id!,
    });

    if (error) {
      toast({ title: "Could not load assessment", description: error.message, variant: "destructive" });
    }
    const row = ((data as AssessmentDetail[]) ?? [])[0] ?? null;
    setAssessment(row);
    setNotes(row?.notes ?? "");
    if (row?.is_mine) {
      setScheduledDate(row.scheduled_date ?? "");
      setScheduledTime(row.scheduled_time ? row.scheduled_time.slice(0, 5) : "");
    }

    if (row && !row.is_mine && row.claimed_by_name) {
      setClaimedMessage(
        `This assessment has already been claimed by ${row.claimed_by_name} for ${formatDate(row.scheduled_date)} ${formatTime(row.scheduled_time)}`.trim(),
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

      if (res.reason === "schedule_required") {
        toast({
          title: "Date and time are required",
          description: "Enter both the visit date and the visit time to claim this assessment.",
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

  async function handleSaveSchedule() {
    if (!scheduledDate || !scheduledTime) {
      toast({
        title: "Date and time are required",
        description: "Enter both the visit date and the visit time.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("reschedule_nurse_assessment", {
        p_assessment_id: id!,
        p_scheduled_date: scheduledDate,
        p_scheduled_time: scheduledTime,
      });
      if (error) throw error;
      const res = data as { success: boolean; reason?: string; rescheduled?: boolean };
      if (!res.success) {
        toast({
          title: "Could not save the visit time",
          description:
            res.reason === "not_yours"
              ? "This assessment isn't assigned to you."
              : "Enter both the visit date and the visit time.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: res.rescheduled ? "Visit rescheduled" : "Visit time saved",
        description: res.rescheduled
          ? "Your coordinator will see that this visit was rescheduled."
          : "Your visit date and time have been saved.",
      });
      await load();
    } catch (error: any) {
      toast({ title: "Could not save the visit time", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }


  async function handleComplete() {
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("complete_nurse_assessment", {
        p_assessment_id: id!,
        p_notes: notes,
      });
      if (error) throw error;
      if (!data) {
        toast({ title: "Could not mark completed", description: "This assessment isn't assigned to you.", variant: "destructive" });
        return;
      }
      toast({ title: "Assessment completed", description: "Your notes have been saved." });
      await load();
    } catch (error: any) {
      toast({ title: "Could not mark completed", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotes() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("nurse_assessments")
        .update({ notes })
        .eq("id", id!);
      if (error) throw error;
      toast({ title: "Notes saved" });
      await load();
    } catch (error: any) {
      toast({ title: "Could not save notes", description: error.message, variant: "destructive" });
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
              <p className="font-medium">This assessment is no longer available to you.</p>
              <Button asChild variant="outline"><Link to="/nurse">Back to my assessments</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span>
                  {assessment.assessment_type === "Nurse Visit"
                    ? "Nurse Visit"
                    : `${assessment.assessment_type} Assessment`}
                </span>
                <Badge variant={assessment.status === "Overdue" ? "destructive" : "secondary"}>
                  {assessment.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{assessment.client_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due date</p>
                  <p className="font-medium">{formatDate(assessment.due_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {assessment.assessment_type === "Nurse Visit" ? "Nurse Visit due" : "618 expiration"}
                  </p>
                  <p className="font-medium">{formatDate(assessment.form_618_expiration_date)}</p>
                </div>
              </div>

              {claimedMessage ? (
                <div className="rounded-lg border bg-muted/50 p-4 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                  <p className="font-medium">{claimedMessage}</p>
                </div>
              ) : assessment.is_mine ? (
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-4">
                    <div>
                      <p className="font-medium">
                        {assessment.scheduled_date
                          ? `Scheduled for ${formatDate(assessment.scheduled_date)} ${formatTime(assessment.scheduled_time)}`
                          : "No visit date and time set yet"}
                      </p>
                      {assessment.rescheduled_at && assessment.previous_scheduled_date && (
                        <p className="text-sm text-muted-foreground">
                          Rescheduled from {formatDate(assessment.previous_scheduled_date)}{" "}
                          {formatTime(assessment.previous_scheduled_time)}
                          {assessment.reschedule_count && assessment.reschedule_count > 1
                            ? ` (changed ${assessment.reschedule_count} times)`
                            : ""}
                        </p>
                      )}
                    </div>
                    {assessment.status !== "Completed" && (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="my_date">Visit date *</Label>
                            <Input
                              id="my_date"
                              type="date"
                              value={scheduledDate}
                              onChange={(e) => setScheduledDate(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="my_time">Visit time *</Label>
                            <Input
                              id="my_time"
                              type="time"
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <Button
                          className="w-full min-h-[44px]"
                          onClick={handleSaveSchedule}
                          disabled={saving || !scheduledDate || !scheduledTime}
                        >
                          {assessment.scheduled_date ? "Update visit date and time" : "Save visit date and time"}
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Visit notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={5}
                      placeholder="Add notes about this assessment visit"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" className="min-h-[44px]" onClick={handleSaveNotes} disabled={saving}>
                      Save notes
                    </Button>
                    {assessment.status !== "Completed" && (
                      <Button className="min-h-[44px] flex-1" onClick={handleComplete} disabled={saving}>
                        Mark completed
                      </Button>
                    )}
                  </div>
                  {assessment.assessment_type !== "Nurse Visit" && (
                    <Button asChild variant="outline" className="w-full min-h-[44px]">
                      <Link to={`/assessments/${id}/form-618`}>Open the 618 assessment form</Link>
                    </Button>
                  )}
                  <Button asChild variant="ghost" className="w-full min-h-[44px]">
                    <Link to="/nurse">Back to my assessments</Link>
                  </Button>
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
