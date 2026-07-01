import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { AlertTriangle, Users, Send, Eye, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TOTAL_SECTIONS = 28;
const AT_RISK_MS = 72 * 60 * 60 * 1000;

type Row = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  cleared_to_schedule: boolean | null;
  orientation_deadline: string | null;
  first_shift_at: string | null;
  percentage: number;
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function OrientationTracker() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [recentReminderIds, setRecentReminderIds] = useState<Set<string>>(new Set());
  const [confirmRow, setConfirmRow] = useState<Row | null>(null);

  const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data: cgs, error } = await supabase
      .from("caregivers")
      .select("id,user_id,first_name,last_name,email,phone,cleared_to_schedule,orientation_deadline,first_shift_at")
      .order("last_name", { ascending: true });
    if (error) {
      toast({ title: "Failed to load caregivers", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const ids = (cgs || []).map((c) => c.id);
    let progressMap: Record<string, number> = {};
    if (ids.length) {
      const { data: prog } = await supabase
        .from("orientation_progress")
        .select("caregiver_id,sections_completed,completed_at")
        .in("caregiver_id", ids);
      for (const p of prog || []) {
        const completed = Array.isArray(p.sections_completed) ? p.sections_completed.length : 0;
        const pct = p.completed_at ? 100 : Math.min(100, Math.round((completed / TOTAL_SECTIONS) * 100));
        progressMap[p.caregiver_id as string] = pct;
      }

      const since = new Date(Date.now() - REMINDER_COOLDOWN_MS).toISOString();
      const { data: recent } = await supabase
        .from("notifications")
        .select("related_id")
        .eq("notification_type", "orientation_reminder")
        .in("related_id", ids)
        .gte("created_at", since);
      setRecentReminderIds(new Set((recent || []).map((n: any) => n.related_id).filter(Boolean)));
    }
    setRows((cgs || []).map((c) => ({ ...c, percentage: progressMap[c.id] || 0 })) as Row[]);
    setLoading(false);
  }

  async function sendReminder(row: Row) {
    if (recentReminderIds.has(row.id)) {
      toast({ title: "Reminder already sent", description: "A reminder was queued within the last 24 hours." });
      return;
    }
    setSendingId(row.id);
    const { error } = await supabase.from("notifications").insert({
      user_id: row.user_id,
      notification_type: "orientation_reminder",
      recipient_email: row.email,
      recipient_phone: row.phone,
      subject: "Complete Your Orientation",
      message: "Please complete your orientation to be cleared for scheduling.",
      email_sent: false,
      sms_sent: false,
      related_id: row.id,
    });
    setSendingId(null);
    if (error) {
      toast({ title: "Reminder failed", description: error.message, variant: "destructive" });
    } else {
      setRecentReminderIds((prev) => new Set(prev).add(row.id));
      toast({ title: "Reminder queued", description: `Sent to ${row.first_name} ${row.last_name}` });
    }
  }

  const notCleared = rows.filter((r) => !r.cleared_to_schedule);
  const atRisk = notCleared.filter((r) => {
    if (!r.first_shift_at) return false;
    const t = new Date(r.first_shift_at).getTime();
    return !isNaN(t) && t - Date.now() <= AT_RISK_MS;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-warning/15 flex items-center justify-center">
              <Users className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Not Yet Cleared</p>
              <p className="text-2xl font-bold">{loading ? "—" : notCleared.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">At Risk (shift &lt; 72h)</p>
              <p className="text-2xl font-bold">{loading ? "—" : atRisk.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caregiver</TableHead>
                <TableHead>Cleared</TableHead>
                <TableHead className="min-w-[180px]">Orientation Progress</TableHead>
                <TableHead>Orientation Deadline</TableHead>
                <TableHead>First Shift</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    No caregivers found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const cleared = !!r.cleared_to_schedule;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.first_name} {r.last_name}</TableCell>
                      <TableCell>
                        {cleared ? (
                          <Badge className="bg-success/15 text-success border border-success/30">Cleared</Badge>
                        ) : (
                          <Badge className="bg-destructive/15 text-destructive border border-destructive/30">Not Cleared</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={r.percentage} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-10 text-right">{r.percentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{fmt(r.orientation_deadline)}</TableCell>
                      <TableCell className="text-sm">{fmt(r.first_shift_at)}</TableCell>
                      <TableCell className="text-right">
                        {cleared ? (
                          <Button size="sm" variant="outline" onClick={() => navigate(`/caregivers/${r.id}`)}>
                            <Eye className="w-3 h-3 mr-1" /> View Record
                          </Button>
                        ) : (() => {
                          const recentlySent = recentReminderIds.has(r.id);
                          return (
                            <Button
                              size="sm"
                              variant={recentlySent ? "outline" : "default"}
                              onClick={() => setConfirmRow(r)}
                              disabled={sendingId === r.id || recentlySent}
                              title={recentlySent ? "Reminder sent within last 24 hours" : undefined}
                            >
                              {sendingId === r.id ? (
                                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Sending…</>
                              ) : recentlySent ? (
                                <><Send className="w-3 h-3 mr-1" /> Reminder Sent</>
                              ) : (
                                <><Send className="w-3 h-3 mr-1" /> Send Reminder</>
                              )}
                            </Button>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmRow} onOpenChange={(o) => !o && setConfirmRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send orientation reminder?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRow && (
                <>
                  A reminder will be queued for <strong>{confirmRow.first_name} {confirmRow.last_name}</strong>
                  {confirmRow.email ? <> via email (<span className="font-mono">{confirmRow.email}</span>)</> : null}
                  {confirmRow.phone ? <> and SMS (<span className="font-mono">{confirmRow.phone}</span>)</> : null}
                  . They won't be reminded again for 24 hours.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const row = confirmRow;
                setConfirmRow(null);
                if (row) void sendReminder(row);
              }}
            >
              Send Reminder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
