import { useEffect, useMemo, useState } from "react";
import { GraduationCap, Loader2, Save } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/friendlyError";
import { useCaregivers } from "@/hooks/useCaregivers";
import {
  useInServiceCompletions,
  useInServiceProgramStart,
} from "@/hooks/useInServiceCompliance";
import { IN_SERVICE_STATUS_LABEL } from "@/utils/inServiceStatus";

export function InServiceProgramStartSection() {
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const { programStart, rowId, loading, reload } = useInServiceProgramStart();
  const { caregivers } = useCaregivers();
  const current = useInServiceCompletions(programStart);
  const [draft, setDraft] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(programStart ?? ""), [programStart]);

  const proposed = useInServiceCompletions(draft || null);

  const changes = useMemo(() => {
    if (current.loading || proposed.loading) return null;
    return caregivers
      .map((c) => {
        const before = current.forCaregiver(c.id, (c as any).hire_date).status;
        const after = proposed.forCaregiver(c.id, (c as any).hire_date).status;
        return { name: `${c.first_name} ${c.last_name}`, before, after };
      })
      .filter((r) => r.before !== r.after);
  }, [caregivers, current, proposed]);

  const save = async () => {
    if (!rowId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("agency_form_defaults")
        .update({
          in_service_program_start_date: draft || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rowId);
      if (error) throw error;
      toast({
        title: "Program start date saved",
        description: "Every caregiver's required hours have been recalculated.",
      });
      setConfirmOpen(false);
      await reload();
      await current.refetch();
    } catch (err: any) {
      toast({ title: "Could not save", description: friendlyError(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">In-service program start date</CardTitle>
        </div>
        <CardDescription>
          The day the video training program became available to caregivers. Training years that ended
          before this date are not graded, and the year in progress on this date is prorated.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="max-w-xs space-y-2">
              <Label htmlFor="in-service-start">Program start date</Label>
              <Input
                id="in-service-start"
                type="date"
                value={draft}
                disabled={!isAdmin || saving}
                onChange={(e) => setDraft(e.target.value)}
              />
            </div>
            {!programStart && (
              <p className="text-sm text-muted-foreground">
                No date set yet — no caregiver is marked past due until you enter one.
              </p>
            )}
            {isAdmin ? (
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={saving || draft === (programStart ?? "")}
              >
                <Save className="w-4 h-4 mr-2" />
                Save program start date
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Only an administrator can change this date.
              </p>
            )}
          </>
        )}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !o && !saving && setConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change the in-service program start date?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  This recalculates required hours and status for every caregiver.
                </p>
                {changes === null ? (
                  <p>Checking who is affected…</p>
                ) : changes.length === 0 ? (
                  <p>No caregiver's status changes.</p>
                ) : (
                  <>
                    <p>
                      <strong>{changes.length}</strong> caregiver
                      {changes.length === 1 ? "" : "s"} will change status:
                    </p>
                    <ul className="max-h-40 overflow-auto text-sm list-disc pl-5">
                      {changes.slice(0, 20).map((r) => (
                        <li key={r.name}>
                          {r.name}: {IN_SERVICE_STATUS_LABEL[r.before]} →{" "}
                          {IN_SERVICE_STATUS_LABEL[r.after]}
                        </li>
                      ))}
                      {changes.length > 20 && <li>…and {changes.length - 20} more</li>}
                    </ul>
                  </>
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
              Save date
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
