import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, Circle, GraduationCap, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/friendlyError";
import { useInServiceCompletions, useInServiceSessionList } from "@/hooks/useInServiceCompliance";
import {
  IN_SERVICE_STATUS_LABEL,
  REQUIRED_IN_SERVICE_HOURS,
  computeInServicePeriod,
  formatPeriodDate,
  inServiceStatusStyle,
} from "@/utils/inServiceStatus";

interface Props {
  caregiverId: string;
  caregiverName: string;
  hireDate: string | null;
  onSaved: () => void;
}

export default function InServiceTab({ caregiverId, caregiverName, hireDate, onSaved }: Props) {
  const { toast } = useToast();
  const { forCaregiver, loading, refetch } = useInServiceCompletions();
  const sessions = useInServiceSessionList();
  const [draftDate, setDraftDate] = useState(hireDate ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraftDate(hireDate ?? ""), [hireDate]);

  const info = forCaregiver(caregiverId, hireDate);
  const newPeriod = computeInServicePeriod(draftDate || null);

  const completedNumbers = new Set(info.completedThisPeriod.map((c) => c.session_number));

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("caregivers")
        .update({ hire_date: draftDate })
        .eq("id", caregiverId);
      if (error) throw error;
      toast({ title: "Hire date updated", description: "The in-service period has been shifted." });
      setConfirmOpen(false);
      onSaved();
      refetch();
    } catch (err: any) {
      toast({ title: "Could not save", description: friendlyError(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="w-4 h-4" /> Annual In-Service
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hireDate && (
            <p className="text-sm font-bold" style={{ color: "#DC2626" }}>
              Hire date missing — enter one to start tracking this caregiver's in-service year.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>Hire date</Label>
              <Input type="date" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current period</p>
              <p className="font-medium">
                {info.period
                  ? `${formatPeriodDate(info.period.start)} – ${formatPeriodDate(info.period.end)}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hours completed</p>
              <p className="font-medium">
                {info.hoursThisPeriod} of {REQUIRED_IN_SERVICE_HOURS}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium" style={inServiceStatusStyle(info.status)}>
                {IN_SERVICE_STATUS_LABEL[info.status]}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            disabled={!draftDate || draftDate === (hireDate ?? "")}
            onClick={() => setConfirmOpen(true)}
          >
            Save hire date
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Completed this period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : info.completedThisPeriod.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing completed in this period yet.</p>
            ) : (
              [...info.completedThisPeriod]
                .sort((a, b) => a.session_number - b.session_number)
                .map((c) => (
                  <div key={c.session_number} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    <span className="flex-1">
                      {c.session_number}. {c.session_title}
                    </span>
                    <span className="text-muted-foreground">
                      {format(new Date(c.completed_at), "MM/dd/yyyy")}
                    </span>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Still outstanding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sessions.filter((s) => !completedNumbers.has(s.session_number)).length === 0 ? (
              <p className="text-sm text-muted-foreground">All twelve sessions are complete.</p>
            ) : (
              sessions
                .filter((s) => !completedNumbers.has(s.session_number))
                .map((s) => (
                  <div key={s.session_number} className="flex items-center gap-2 text-sm">
                    <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>
                      {s.session_number}. {s.title}
                    </span>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>

      {info.completedEarlier.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Completed in earlier periods</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {[...info.completedEarlier]
              .sort((a, b) => a.session_number - b.session_number)
              .map((c) => (
                <Badge key={`${c.session_number}-${c.completed_at}`} variant="secondary">
                  {c.session_number}. {c.session_title} · {format(new Date(c.completed_at), "MM/dd/yyyy")}
                </Badge>
              ))}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !o && !saving && setConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change {caregiverName}'s hire date?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>This shifts the whole in-service year, so hours may move in or out of the period.</p>
                <p>
                  <strong>New period:</strong>{" "}
                  {newPeriod
                    ? `${formatPeriodDate(newPeriod.start)} – ${formatPeriodDate(newPeriod.end)}`
                    : "—"}
                </p>
                {info.period && (
                  <p>
                    <strong>Current period:</strong>{" "}
                    {`${formatPeriodDate(info.period.start)} – ${formatPeriodDate(info.period.end)}`}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                save();
              }}
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save new hire date
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
