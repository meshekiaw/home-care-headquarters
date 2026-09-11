import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, Plus, CheckCircle, Loader2, Pencil, Trash2, RotateCcw } from "lucide-react";

interface Assessment {
  id: string;
  client_id: string;
  assessment_type: string;
  due_date: string;
  assigned_nurse_id: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
  notes: string | null;
  clients: { first_name: string; last_name: string } | null;
  nurses: { first_name: string; last_name: string } | null;
}

interface Option {
  id: string;
  first_name: string;
  last_name: string;
}

const STATUSES = ["Pending", "Claimed", "Completed", "Overdue"];

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

function statusBadge(status: string) {
  switch (status) {
    case "Overdue":
      return <Badge variant="destructive">Overdue</Badge>;
    case "Completed":
      return <Badge className="bg-success text-success-foreground">Completed</Badge>;
    case "Claimed":
      return <Badge className="bg-primary text-primary-foreground">Claimed</Badge>;
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
}

export default function NurseAssessments() {
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [clients, setClients] = useState<Option[]>([]);
  const [nurses, setNurses] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    client_id: "",
    due_date: "",
    assessment_type: "618",
    assigned_nurse_id: "",
    notes: "",
  });

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: rows, error }, { data: clientRows }, { data: nurseRows }] =
      await Promise.all([
        supabase
          .from("nurse_assessments")
          .select(
            "id, client_id, assessment_type, due_date, assigned_nurse_id, scheduled_date, scheduled_time, status, notes, clients(first_name,last_name), nurses(first_name,last_name)",
          )
          .order("due_date", { ascending: true }),
        supabase.from("clients").select("id, first_name, last_name").order("last_name"),
        supabase.from("nurses").select("id, first_name, last_name").order("last_name"),
      ]);

    if (error) {
      toast({ title: "Could not load assessments", description: error.message, variant: "destructive" });
    }
    setAssessments((rows as unknown as Assessment[]) ?? []);
    setClients((clientRows as Option[]) ?? []);
    setNurses((nurseRows as Option[]) ?? []);
    setLoading(false);
  }

  const filtered = useMemo(
    () =>
      assessments.filter((a) => {
        if (statusFilter !== "all" && a.status !== statusFilter) return false;
        if (fromDate && a.due_date < fromDate) return false;
        if (toDate && a.due_date > toDate) return false;
        return true;
      }),
    [assessments, statusFilter, fromDate, toDate],
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in");

      const { error } = await supabase.from("nurse_assessments").insert({
        user_id: user.id,
        client_id: form.client_id,
        assessment_type: form.assessment_type || "618",
        due_date: form.due_date,
        assigned_nurse_id: form.assigned_nurse_id || null,
        status: form.assigned_nurse_id ? "Claimed" : "Pending",
        claimed_at: form.assigned_nurse_id ? new Date().toISOString() : null,
        notes: form.notes || null,
      });
      if (error) throw error;

      toast({ title: "Assessment created" });
      setCreateOpen(false);
      setForm({ client_id: "", due_date: "", assessment_type: "618", assigned_nurse_id: "", notes: "" });
      await loadAll();
    } catch (error: any) {
      toast({ title: "Could not create assessment", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function reassign(assessment: Assessment, nurseId: string) {
    const { error } = await supabase
      .from("nurse_assessments")
      .update({
        assigned_nurse_id: nurseId === "unassigned" ? null : nurseId,
        status:
          nurseId === "unassigned"
            ? "Pending"
            : assessment.status === "Completed"
              ? "Completed"
              : "Claimed",
        claimed_at: nurseId === "unassigned" ? null : new Date().toISOString(),
      })
      .eq("id", assessment.id);

    if (error) {
      toast({ title: "Could not reassign", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: nurseId === "unassigned" ? "Assessment released" : "Nurse reassigned" });
    await loadAll();
  }

  async function markCompleted(id: string) {
    const { error } = await supabase
      .from("nurse_assessments")
      .update({ status: "Completed", completed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Could not update", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Assessment marked completed" });
    await loadAll();
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-primary" />
              Nurse Assessments
            </h1>
            <p className="text-muted-foreground text-sm">
              618 assessments created 30 days before expiration, claimed by nurses.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Assessment
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due from</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Due to</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">No assessments match these filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-3 font-medium">Client</th>
                      <th className="p-3 font-medium">Type</th>
                      <th className="p-3 font-medium">Due Date</th>
                      <th className="p-3 font-medium">Assigned Nurse</th>
                      <th className="p-3 font-medium">Scheduled</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => (
                      <tr key={a.id} className="border-t">
                        <td className="p-3 font-medium">
                          {a.clients ? `${a.clients.first_name} ${a.clients.last_name}` : "—"}
                        </td>
                        <td className="p-3">{a.assessment_type}</td>
                        <td className="p-3">{formatDate(a.due_date)}</td>
                        <td className="p-3 min-w-[190px]">
                          <Select
                            value={a.assigned_nurse_id ?? "unassigned"}
                            onValueChange={(value) => reassign(a, value)}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {nurses.map((n) => (
                                <SelectItem key={n.id} value={n.id}>
                                  {n.first_name} {n.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {a.scheduled_date ? `${formatDate(a.scheduled_date)} ${formatTime(a.scheduled_time)}` : "—"}
                        </td>
                        <td className="p-3">{statusBadge(a.status)}</td>
                        <td className="p-3 text-right">
                          {a.status !== "Completed" && (
                            <Button size="sm" variant="outline" onClick={() => markCompleted(a.id)}>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Complete
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Assessment</DialogTitle>
            <DialogDescription>Create a 618 assessment manually.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assessment type</Label>
              <Input
                value={form.assessment_type}
                onChange={(e) => setForm((f) => ({ ...f, assessment_type: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Due date *</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Assign nurse (optional)</Label>
              <Select
                value={form.assigned_nurse_id || "unassigned"}
                onValueChange={(v) => setForm((f) => ({ ...f, assigned_nurse_id: v === "unassigned" ? "" : v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Leave unassigned</SelectItem>
                  {nurses.map((n) => (
                    <SelectItem key={n.id} value={n.id}>{n.first_name} {n.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.client_id || !form.due_date}>
                {saving ? "Creating..." : "Create Assessment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
