import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Calendar, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ClientAssignment {
  id: string;
  client_id: string;
  assigned_date: string;
  role: string | null;
  is_active: boolean | null;
  notes: string | null;
  created_at: string;
  clients: {
    id: string;
    first_name: string;
    last_name: string;
    status: string;
  };
}

interface AssignmentsHistoryTabProps {
  caregiverId: string;
}

export default function AssignmentsHistoryTab({ caregiverId }: AssignmentsHistoryTabProps) {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<ClientAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, [caregiverId]);

  async function fetchAssignments() {
    try {
      const { data, error } = await supabase
        .from('client_caregivers')
        .select(`
          id,
          client_id,
          assigned_date,
          role,
          is_active,
          notes,
          created_at,
          clients (
            id,
            first_name,
            last_name,
            status
          )
        `)
        .eq('caregiver_id', caregiverId)
        .order('assigned_date', { ascending: false });

      if (error) throw error;
      setAssignments((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Error loading assignments",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case 'primary': return 'default';
      case 'backup': return 'secondary';
      case 'specialist': return 'outline';
      default: return 'secondary';
    }
  };

  const activeAssignments = assignments.filter(a => a.is_active);
  const pastAssignments = assignments.filter(a => !a.is_active);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Assignments Yet</h3>
          <p className="text-muted-foreground max-w-sm">
            This caregiver hasn't been assigned to any clients yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeAssignments.length}</p>
              <p className="text-sm text-muted-foreground">Current Clients</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pastAssignments.length}</p>
              <p className="text-sm text-muted-foreground">Past Assignments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Assignments */}
      {activeAssignments.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Current Assignments ({activeAssignments.length})
          </h4>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {assignment.clients.first_name.charAt(0)}
                          {assignment.clients.last_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">
                            {assignment.clients.first_name} {assignment.clients.last_name}
                          </p>
                          <Badge variant={assignment.clients.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                            {assignment.clients.status}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(assignment.role)} className="capitalize">
                        {assignment.role || 'Caregiver'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(assignment.assigned_date)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {assignment.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Past Assignments */}
      {pastAssignments.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Past Assignments ({pastAssignments.length})
          </h4>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastAssignments.map((assignment) => (
                  <TableRow key={assignment.id} className="opacity-70">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                          {assignment.clients.first_name.charAt(0)}
                          {assignment.clients.last_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">
                            {assignment.clients.first_name} {assignment.clients.last_name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {assignment.role || 'Caregiver'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(assignment.assigned_date)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {assignment.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
