import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Calendar, User, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

type Assessment = {
  id: string;
  client_id: string;
  assigned_nurse_id: string | null;
  assessment_type: string | null;
  assessment_name: string | null;
  due_date: string | null;
  assessment_deadline: string | null;
  completed_date: string | null;
  status: string | null;
  notes: string | null;
  family_name: string | null;
  family_phone: string | null;
  family_email: string | null;
  created_at: string;
  updated_at: string;
  clients?: { first_name: string; last_name: string } | null;
};

type Column = "pending" | "scheduled" | "completed" | "overdue";

const COLUMNS: { key: Column; label: string; badgeClass: string; ring: string }[] = [
  { key: "pending", label: "Pending", badgeClass: "bg-warning/15 text-warning border-warning/30", ring: "border-warning/30" },
  { key: "scheduled", label: "Scheduled", badgeClass: "bg-primary/15 text-primary border-primary/30", ring: "border-primary/30" },
  { key: "completed", label: "Completed", badgeClass: "bg-success/15 text-success border-success/30", ring: "border-success/30" },
  { key: "overdue", label: "Overdue", badgeClass: "bg-destructive/15 text-destructive border-destructive/30", ring: "border-destructive" },
];

function formatDeadline(iso: string | null) {
  if (!iso) return "No deadline";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "No deadline";
  return "Due: " + d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDeadline(a: Assessment): string | null {
  return a.assessment_deadline || a.due_date || null;
}

function bucketOf(a: Assessment): Column {
  const status = (a.status || "pending").toLowerCase();
  const deadline = getDeadline(a);
  const isPast = deadline ? new Date(deadline).getTime() < Date.now() : false;
  if (status !== "completed" && isPast) return "overdue";
  if (status === "completed") return "completed";
  if (status === "scheduled") return "scheduled";
  if (status === "overdue") return "overdue";
  return "pending";
}

export default function OnboardingPipeline() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Assessment[]>([]);
  const [selected, setSelected] = useState<Assessment | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_assessments")
      .select("*, clients(first_name, last_name)")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error loading pipeline", description: error.message, variant: "destructive" });
    } else {
      setItems((data as unknown as Assessment[]) || []);
    }
    setLoading(false);
  }

  const grouped: Record<Column, Assessment[]> = {
    pending: [],
    scheduled: [],
    completed: [],
    overdue: [],
  };
  for (const a of items) grouped[bucketOf(a)].push(a);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-semibold text-sm uppercase tracking-wide">{col.label}</h3>
              <Badge variant="outline" className={col.badgeClass}>{grouped[col.key].length}</Badge>
            </div>
            <div className="space-y-3 min-h-[120px] bg-muted/30 border rounded-lg p-3">
              {loading ? (
                <>
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </>
              ) : grouped[col.key].length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No assessments</p>
              ) : (
                grouped[col.key].map((a) => {
                  const deadline = getDeadline(a);
                  const isOverdue = col.key === "overdue";
                  const clientName = a.clients
                    ? `${a.clients.first_name} ${a.clients.last_name}`
                    : "Unknown Client";
                  return (
                    <Card
                      key={a.id}
                      className={cn(
                        "transition-shadow hover:shadow-md",
                        isOverdue ? "border-2 border-destructive" : ""
                      )}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm leading-tight">{clientName}</p>
                          <Badge variant="outline" className={cn("text-[10px]", col.badgeClass)}>
                            {col.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {a.assessment_name || a.assessment_type || "Assessment"}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className={isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}>
                            {formatDeadline(deadline)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span>{a.assigned_nurse_id ? "Nurse assigned" : "No nurse assigned"}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-7 text-xs"
                          onClick={() => setSelected(a)}
                        >
                          <Eye className="w-3 h-3 mr-1" /> View
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {selected.clients
                    ? `${selected.clients.first_name} ${selected.clients.last_name}`
                    : "Assessment"}
                </SheetTitle>
                <SheetDescription>
                  {selected.assessment_name || selected.assessment_type || "Assessment details"}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <Field label="Status" value={selected.status || "pending"} />
                <Field label="Assessment Type" value={selected.assessment_type} />
                <Field label="Assessment Name" value={selected.assessment_name} />
                <Field label="Deadline" value={formatDeadline(getDeadline(selected))} />
                <Field label="Due Date" value={selected.due_date} />
                <Field label="Completed Date" value={selected.completed_date} />
                <Field
                  label="Assigned Nurse"
                  value={selected.assigned_nurse_id ? "Nurse assigned" : "No nurse assigned"}
                />
                <Field label="Notes" value={selected.notes} multiline />
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Family Contact
                  </p>
                  <div className="space-y-3">
                    <Field label="Name" value={selected.family_name} />
                    <Field label="Phone" value={selected.family_phone} />
                    <Field label="Email" value={selected.family_email} />
                  </div>
                </div>
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  Created {new Date(selected.created_at).toLocaleString()}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Field({ label, value, multiline }: { label: string; value: string | null; multiline?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {multiline ? (
        <p className="whitespace-pre-wrap mt-0.5">{value || "—"}</p>
      ) : (
        <p className="mt-0.5">{value || "—"}</p>
      )}
    </div>
  );
}
