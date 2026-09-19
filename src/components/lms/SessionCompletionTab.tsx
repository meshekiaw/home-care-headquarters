import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/friendlyError";
import { downloadCSV } from "@/utils/csvExport";

interface Row {
  id: string;
  status: string;
  completed_at: string | null;
  score: number | null;
  attempts: number;
  due_date: string | null;
  caregiver_id: string;
  caregiver_name: string;
  session_number: number;
  session_title: string;
  passing_score: number | null;
  watched_percent: number | null;
  watched_seconds: number | null;
  video_completed_at: string | null;
}

interface Attempt {
  id: string;
  attempt_number: number;
  score: number;
  passing_score: number;
  passed: boolean;
  attempted_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
};

export default function SessionCompletionTab() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [caregiverFilter, setCaregiverFilter] = useState("all");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Record<string, Attempt[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lms_assignments")
      .select("id, status, completed_at, score, attempts, due_date, caregiver_id, caregivers(first_name, last_name), lms_courses!inner(session_number, title, passing_score)")
      .not("lms_courses.session_number", "is", null);
    if (error) {
      toast({ title: "Error loading completions", description: friendlyError(error), variant: "destructive" });
      setLoading(false);
      return;
    }
    const ids = ((data as any[]) || []).map((a) => a.id);
    const { data: progress } = await supabase
      .from("lms_video_progress")
      .select("assignment_id, percent_complete, watched_seconds, video_completed_at")
      .in("assignment_id", ids);
    const progressMap = new Map((progress || []).map((p: any) => [p.assignment_id, p]));

    const mapped: Row[] = ((data as any[]) || []).map((a) => ({
      id: a.id,
      status: a.status,
      completed_at: a.completed_at,
      score: a.score,
      attempts: a.attempts ?? 0,
      due_date: a.due_date,
      caregiver_id: a.caregiver_id,
      caregiver_name: `${a.caregivers?.first_name ?? ""} ${a.caregivers?.last_name ?? ""}`.trim() || "Unknown",
      session_number: a.lms_courses.session_number,
      session_title: a.lms_courses.title,
      passing_score: a.lms_courses.passing_score,
      watched_percent: progressMap.get(a.id)?.percent_complete ?? null,
      watched_seconds: progressMap.get(a.id)?.watched_seconds ?? null,
      video_completed_at: progressMap.get(a.id)?.video_completed_at ?? null,
    }));
    mapped.sort((x, y) =>
      x.caregiver_name.localeCompare(y.caregiver_name) || x.session_number - y.session_number
    );
    setRows(mapped);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const caregivers = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => m.set(r.caregiver_id, r.caregiver_name));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const sessions = useMemo(() => {
    const m = new Map<number, string>();
    rows.forEach((r) => m.set(r.session_number, r.session_title));
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [rows]);

  const filtered = rows.filter(
    (r) =>
      (caregiverFilter === "all" || r.caregiver_id === caregiverFilter) &&
      (sessionFilter === "all" || String(r.session_number) === sessionFilter) &&
      (statusFilter === "all" || r.status === statusFilter)
  );

  const toggle = async (row: Row) => {
    if (expanded === row.id) { setExpanded(null); return; }
    setExpanded(row.id);
    if (attempts[row.id]) return;
    const { data, error } = await supabase
      .from("lms_quiz_attempts")
      .select("id, attempt_number, score, passing_score, passed, attempted_at")
      .eq("assignment_id", row.id)
      .order("attempt_number", { ascending: true });
    if (error) {
      toast({ title: "Error loading attempts", description: friendlyError(error), variant: "destructive" });
      return;
    }
    setAttempts((p) => ({ ...p, [row.id]: (data as Attempt[]) || [] }));
  };

  const exportCsv = () => {
    downloadCSV(
      filtered.map((r) => ({
        Caregiver: r.caregiver_name,
        Session: r.session_number,
        Title: r.session_title,
        Status: STATUS_LABEL[r.status] ?? r.status,
        "Date Completed": r.completed_at ? format(new Date(r.completed_at), "MM/dd/yyyy h:mm a") : "",
        Score: r.score ?? "",
        "Pass Mark": r.passing_score ?? 70,
        Attempts: r.attempts,
        "Video Watched %": r.watched_percent ?? "",
        "Video Watched Minutes": r.watched_seconds != null ? Math.round(r.watched_seconds / 60) : "",
        "Video Finished": r.video_completed_at ? format(new Date(r.video_completed_at), "MM/dd/yyyy h:mm a") : "",
        Due: r.due_date ? format(new Date(r.due_date), "MM/dd/yyyy") : "",
      })),
      `in-service-completions-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
  };

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Caregiver</label>
            <Select value={caregiverFilter} onValueChange={setCaregiverFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All caregivers</SelectItem>
                {caregivers.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Session</label>
            <Select value={sessionFilter} onValueChange={setSessionFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sessions</SelectItem>
                {sessions.map(([n, t]) => <SelectItem key={n} value={String(n)}>{n}. {t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Assigned</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No in-service sessions assigned yet. Assign sessions from the Assignments tab.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Caregiver</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date completed</TableHead>
                  <TableHead>Video watched</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Attempts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <>
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => toggle(r)}>
                      <TableCell>
                        {expanded === r.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </TableCell>
                      <TableCell className="font-medium">{r.caregiver_name}</TableCell>
                      <TableCell>{r.session_number}. {r.session_title}</TableCell>
                      <TableCell>
                        {r.status === "completed" ? (
                          <Badge className="bg-success/10 text-success border-success/20">Completed</Badge>
                        ) : r.status === "in_progress" ? (
                          <Badge className="bg-warning/10 text-warning border-warning/20">In progress</Badge>
                        ) : (
                          <Badge variant="secondary">Assigned</Badge>
                        )}
                      </TableCell>
                      <TableCell>{r.completed_at ? format(new Date(r.completed_at), "MMM d, yyyy h:mm a") : "—"}</TableCell>
                      <TableCell>
                        {r.watched_percent != null ? (
                          <span className={r.watched_percent >= 95 ? "text-success" : ""}>{r.watched_percent}%</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{r.score != null ? `${r.score}%` : "—"}</TableCell>
                      <TableCell>{r.attempts}</TableCell>
                    </TableRow>
                    {expanded === r.id && (
                      <TableRow key={`${r.id}-attempts`}>
                        <TableCell colSpan={8} className="bg-muted/40">
                          <p className="text-xs font-medium mb-2">Quiz attempts (all retained)</p>
                          {!attempts[r.id] ? (
                            <Skeleton className="h-8" />
                          ) : attempts[r.id].length === 0 ? (
                            <p className="text-xs text-muted-foreground">No quiz attempts recorded yet.</p>
                          ) : (
                            <ul className="space-y-1 text-xs">
                              {attempts[r.id].map((a) => (
                                <li key={a.id} className="flex flex-wrap gap-3">
                                  <span className="font-medium">Attempt {a.attempt_number}</span>
                                  <span>{format(new Date(a.attempted_at), "MMM d, yyyy h:mm a")}</span>
                                  <span>{a.score}% (pass {a.passing_score}%)</span>
                                  <span className={a.passed ? "text-success" : "text-destructive"}>
                                    {a.passed ? "Passed" : "Did not pass"}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
