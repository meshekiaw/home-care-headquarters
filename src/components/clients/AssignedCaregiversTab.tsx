import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Users, Phone, Mail, Calendar, UserCheck, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Caregiver {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  specializations: string[] | null;
  status: string;
}

interface ClientCaregiver {
  id: string;
  caregiver_id: string;
  assigned_date: string;
  role: string | null;
  is_active: boolean | null;
  notes: string | null;
  caregivers: Caregiver;
}

interface AssignedCaregiversTabProps {
  clientId: string;
}

export function AssignedCaregiversTab({ clientId }: AssignedCaregiversTabProps) {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<ClientCaregiver[]>([]);
  const [availableCaregivers, setAvailableCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    caregiver_id: "",
    role: "primary",
    notes: "",
  });

  useEffect(() => {
    fetchAssignments();
    fetchAvailableCaregivers();
  }, [clientId]);

  async function fetchAssignments() {
    try {
      const { data, error } = await supabase
        .from('client_caregivers')
        .select(`
          id,
          caregiver_id,
          assigned_date,
          role,
          is_active,
          notes,
          caregivers (
            id,
            first_name,
            last_name,
            email,
            phone,
            specializations,
            status
          )
        `)
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('assigned_date', { ascending: false });

      if (error) throw error;
      setAssignments((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Error loading caregivers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchAvailableCaregivers() {
    try {
      const { data, error } = await supabase
        .from('caregivers')
        .select('*')
        .eq('status', 'active')
        .order('first_name');

      if (error) throw error;
      setAvailableCaregivers(data || []);
    } catch (error: any) {
      console.error('Error fetching caregivers:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in");

      const { error } = await supabase.from('client_caregivers').insert([{
        client_id: clientId,
        caregiver_id: formData.caregiver_id,
        user_id: user.id,
        role: formData.role,
        notes: formData.notes || null,
        is_active: true,
      }]);

      if (error) throw error;

      toast({ title: "Caregiver assigned successfully!" });
      setDialogOpen(false);
      setFormData({ caregiver_id: "", role: "primary", notes: "" });
      fetchAssignments();
    } catch (error: any) {
      toast({
        title: "Error assigning caregiver",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      const { error } = await supabase
        .from('client_caregivers')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Caregiver removed from client!" });
      fetchAssignments();
    } catch (error: any) {
      toast({
        title: "Error removing caregiver",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case 'primary': return 'default';
      case 'backup': return 'secondary';
      case 'specialist': return 'outline';
      default: return 'secondary';
    }
  };

  // Filter out already assigned caregivers
  const assignedIds = assignments.map(a => a.caregiver_id);
  const unassignedCaregivers = availableCaregivers.filter(c => !assignedIds.includes(c.id));

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Assigned Caregivers</h3>
          <p className="text-sm text-muted-foreground">Manage caregivers assigned to this client</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={unassignedCaregivers.length === 0}>
              <Plus className="w-4 h-4 mr-2" />
              Assign Caregiver
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Caregiver</DialogTitle>
              <DialogDescription>Select a caregiver to assign to this client</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="caregiver_id">Caregiver *</Label>
                <Select 
                  value={formData.caregiver_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, caregiver_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a caregiver" />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedCaregivers.map((cg) => (
                      <SelectItem key={cg.id} value={cg.id}>
                        {cg.first_name} {cg.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary Caregiver</SelectItem>
                    <SelectItem value="backup">Backup Caregiver</SelectItem>
                    <SelectItem value="specialist">Specialist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any notes about this assignment..."
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving} disabled={!formData.caregiver_id}>
                  Assign Caregiver
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {availableCaregivers.length === 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="w-5 h-5 text-warning" />
            <p className="text-sm">
              No caregivers in the system yet. <a href="/caregivers" className="text-primary hover:underline">Add caregivers</a> first to assign them to clients.
            </p>
          </CardContent>
        </Card>
      )}

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Caregivers Assigned</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Assign caregivers to this client to manage their care team.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-semibold text-primary">
                        {assignment.caregivers.first_name.charAt(0)}
                        {assignment.caregivers.last_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {assignment.caregivers.first_name} {assignment.caregivers.last_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getRoleBadgeVariant(assignment.role)} className="text-xs capitalize">
                          {assignment.role || 'Caregiver'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        Assigned {formatDate(assignment.assigned_date)}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRemove(assignment.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="mt-4 pt-3 border-t space-y-2">
                  {assignment.caregivers.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      <a href={`tel:${assignment.caregivers.phone}`} className="hover:text-primary">
                        {assignment.caregivers.phone}
                      </a>
                    </div>
                  )}
                  {assignment.caregivers.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      <a href={`mailto:${assignment.caregivers.email}`} className="hover:text-primary">
                        {assignment.caregivers.email}
                      </a>
                    </div>
                  )}
                  {assignment.caregivers.specializations && assignment.caregivers.specializations.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {assignment.caregivers.specializations.map((spec, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {assignment.notes && (
                  <p className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                    {assignment.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
