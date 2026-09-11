import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import LegalFooter from "@/components/layout/LegalFooter";
import { ClipboardCheck, Loader2, LogOut } from "lucide-react";

interface NurseAssessmentRow {
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

function statusBadge(status: string) {
  if (status === "Overdue") return <Badge variant="destructive">Overdue</Badge>;
  if (status === "Completed") return <Badge className="bg-success text-success-foreground">Completed</Badge>;
  if (status === "Claimed") return <Badge className="bg-primary text-primary-foreground">Claimed</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

export default function NursePortal() {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [rows, setRows] = useState<NurseAssessmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("nurse_visible_assessments");
    if (error) {
      toast({ title: "Could not load assessments", description: error.message, variant: "destructive" });
    }
    setRows((data as NurseAssessmentRow[]) ?? []);
    setLoading(false);
  }

  const mine = rows.filter((r) => r.is_mine);
  const available = rows.filter((r) => !r.is_mine);

  function renderList(list: NurseAssessmentRow[], emptyText: string) {
    if (list.length === 0) {
      return <p className="text-muted-foreground py-6">{emptyText}</p>;
    }
    return (
      <ul className="divide-y">
        {list.map((row) => (
          <li key={row.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{row.client_name}</span>
                {statusBadge(row.status)}
              </div>
              <p className="text-sm text-muted-foreground">
                {row.assessment_type} · Due {formatDate(row.due_date)} · 618 expires{" "}
                {formatDate(row.form_618_expiration_date)}
              </p>
              {row.scheduled_date && (
                <p className="text-sm text-muted-foreground">
                  Scheduled {formatDate(row.scheduled_date)} {formatTime(row.scheduled_time)}
                </p>
              )}
            </div>
            <Button asChild variant={row.is_mine ? "outline" : "default"} className="min-h-[44px]">
              <Link to={`/assessments/${row.id}/claim`}>{row.is_mine ? "Open" : "Claim"}</Link>
            </Button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <span className="font-semibold">Home Care Headquarters</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              <LogOut className="w-4 h-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Assessments</h1>
          <p className="text-muted-foreground">Your assigned visits and unclaimed assessments you can pick up.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>My assessments</CardTitle>
              </CardHeader>
              <CardContent>{renderList(mine, "You haven't claimed any assessments yet.")}</CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available to claim</CardTitle>
              </CardHeader>
              <CardContent>{renderList(available, "No unclaimed assessments right now.")}</CardContent>
            </Card>
          </>
        )}
      </main>

      <LegalFooter />
    </div>
  );
}
