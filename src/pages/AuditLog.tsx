import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Shield, Search, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface AuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  created_at: string;
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [tableFilter, setTableFilter] = useState("all");

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from("audit_logs")
      .select("id, user_id, action, table_name, record_id, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (actionFilter !== "all") query = query.eq("action", actionFilter);
    if (tableFilter !== "all") query = query.eq("table_name", tableFilter);

    const { data } = await query;
    setLogs((data as AuditEntry[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [actionFilter, tableFilter]);

  const actionColor = (a: string) => {
    if (a === "create") return "default";
    if (a === "update") return "secondary";
    if (a === "delete") return "destructive";
    return "outline";
  };

  const filtered = logs.filter(
    (l) =>
      !search ||
      l.table_name.includes(search.toLowerCase()) ||
      l.record_id?.includes(search) ||
      l.user_id?.includes(search)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">HIPAA Audit Log</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by table, record, or user ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tables</SelectItem>
                  <SelectItem value="clients">Clients</SelectItem>
                  <SelectItem value="caregivers">Caregivers</SelectItem>
                  <SelectItem value="medical_history">Medical History</SelectItem>
                  <SelectItem value="care_plans">Care Plans</SelectItem>
                  <SelectItem value="client_documents">Documents</SelectItem>
                  <SelectItem value="caregiver_credentials">Credentials</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchLogs}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            <div className="rounded-md border overflow-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Record ID</TableHead>
                    <TableHead>User ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit entries found</TableCell></TableRow>
                  ) : (
                    filtered.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm whitespace-nowrap">{format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}</TableCell>
                        <TableCell><Badge variant={actionColor(log.action)}>{log.action}</Badge></TableCell>
                        <TableCell className="font-mono text-sm">{log.table_name}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[120px] truncate">{log.record_id || "—"}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[120px] truncate">{log.user_id || "system"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
