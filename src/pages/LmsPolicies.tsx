import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText, Users, CheckCircle2, AlertCircle, Plus, Eye, Search, Shield,
} from "lucide-react";
import { useLmsPolicies } from "@/hooks/useLmsPolicies";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import AddPolicyDialog from "@/components/lms/AddPolicyDialog";
import PolicyViewDialog from "@/components/lms/PolicyViewDialog";
import RecordAcknowledgmentDialog from "@/components/lms/RecordAcknowledgmentDialog";
import { Input } from "@/components/ui/input";

export default function LmsPolicies() {
  const { policies, acknowledgments, loading, getAcknowledgmentsForPolicy } = useLmsPolicies();
  const [addPolicyOpen, setAddPolicyOpen] = useState(false);
  const [viewPolicy, setViewPolicy] = useState<string | null>(null);
  const [ackDialogPolicy, setAckDialogPolicy] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalCaregivers, setTotalCaregivers] = useState(0);

  useEffect(() => {
    supabase
      .from("caregivers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .then(({ count }) => setTotalCaregivers(count || 0));
  }, []);

  const activePolicies = policies.filter((p) => p.is_active);
  const totalAcks = acknowledgments.length;
  const totalRequired = activePolicies.filter((p) => p.requires_acknowledgment).length * totalCaregivers;
  const ackRate = totalRequired > 0 ? Math.round((totalAcks / totalRequired) * 100) : 0;

  const filteredPolicies = policies.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedPolicy = policies.find((p) => p.id === viewPolicy);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Policy Acknowledgments</h2>
            <p className="text-muted-foreground">Manage policies and track staff acknowledgments</p>
          </div>
          <Button onClick={() => setAddPolicyOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Policy
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activePolicies.length}</p>
                  <p className="text-sm text-muted-foreground">Active Policies</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalAcks}</p>
                  <p className="text-sm text-muted-foreground">Acknowledgments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <Shield className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{ackRate}%</p>
                  <p className="text-sm text-muted-foreground">Compliance Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-destructive/10">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalRequired - totalAcks > 0 ? totalRequired - totalAcks : 0}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="policies">
          <TabsList>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="acknowledgments">Acknowledgment Log</TabsTrigger>
          </TabsList>

          <TabsContent value="policies" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search policies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPolicies.map((policy) => {
                const policyAcks = getAcknowledgmentsForPolicy(policy.id);
                const ackCount = policyAcks.length;
                const ackPercent = totalCaregivers > 0 ? Math.round((ackCount / totalCaregivers) * 100) : 0;
                return (
                  <Card key={policy.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{policy.title}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            v{policy.version} • Effective: {format(new Date(policy.effective_date), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {policy.is_active ? (
                            <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                          <Badge variant="secondary" className="capitalize text-xs">{policy.category}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{policy.description || "No description"}</p>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">{ackCount}/{totalCaregivers} acknowledged</span>
                        <span className="font-medium">{ackPercent}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full bg-success rounded-full transition-all"
                          style={{ width: `${ackPercent}%` }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setViewPolicy(policy.id)}>
                          <Eye className="w-3 h-3 mr-1" /> View
                        </Button>
                        <Button size="sm" onClick={() => setAckDialogPolicy(policy.id)}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Record Acknowledgment
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {filteredPolicies.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No policies yet. Add your first policy to get started.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="acknowledgments" className="space-y-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caregiver</TableHead>
                    <TableHead>Policy</TableHead>
                    <TableHead>Acknowledged At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acknowledgments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No acknowledgments recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    acknowledgments.map((ack) => {
                      const policy = policies.find((p) => p.id === ack.policy_id);
                      return (
                        <TableRow key={ack.id}>
                          <TableCell className="font-medium">
                            {ack.caregiver ? `${ack.caregiver.first_name} ${ack.caregiver.last_name}` : "Unknown"}
                          </TableCell>
                          <TableCell>{policy?.title || "Unknown"}</TableCell>
                          <TableCell>{format(new Date(ack.acknowledged_at), "MMM d, yyyy h:mm a")}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AddPolicyDialog open={addPolicyOpen} onOpenChange={setAddPolicyOpen} />
      {selectedPolicy && (
        <PolicyViewDialog
          open={!!viewPolicy}
          onOpenChange={() => setViewPolicy(null)}
          policy={selectedPolicy}
        />
      )}
      {ackDialogPolicy && (
        <RecordAcknowledgmentDialog
          open={!!ackDialogPolicy}
          onOpenChange={() => setAckDialogPolicy(null)}
          policyId={ackDialogPolicy}
        />
      )}
    </DashboardLayout>
  );
}
