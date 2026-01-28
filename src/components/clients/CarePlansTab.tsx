import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Plus, ClipboardList, Calendar, Target, Clock, Trash2, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CarePlan {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  goals: string | null;
  frequency: string | null;
  created_at: string;
}

interface CarePlansTabProps {
  clientId: string;
}

export function CarePlansTab({ clientId }: CarePlansTabProps) {
  const { toast } = useToast();
  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "active",
    goals: "",
    frequency: "",
  });

  useEffect(() => {
    fetchCarePlans();
  }, [clientId]);

  async function fetchCarePlans() {
    try {
      const { data, error } = await supabase
        .from('care_plans')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCarePlans(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading care plans",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in");

      const { error } = await supabase.from('care_plans').insert([{
        client_id: clientId,
        user_id: user.id,
        title: formData.title,
        description: formData.description || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: formData.status,
        goals: formData.goals || null,
        frequency: formData.frequency || null,
      }]);

      if (error) throw error;

      toast({ title: "Care plan added successfully!" });
      setDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        start_date: "",
        end_date: "",
        status: "active",
        goals: "",
        frequency: "",
      });
      fetchCarePlans();
    } catch (error: any) {
      toast({
        title: "Error adding care plan",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('care_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Care plan deleted successfully!" });
      fetchCarePlans();
    } catch (error: any) {
      toast({
        title: "Error deleting care plan",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success';
      case 'completed': return 'bg-primary/10 text-primary';
      case 'on-hold': return 'bg-warning/10 text-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

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
          <h3 className="text-lg font-semibold">Care Plans</h3>
          <p className="text-sm text-muted-foreground">Manage care plans for this client</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Care Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Care Plan</DialogTitle>
              <DialogDescription>Create a care plan for this client</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Plan Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Daily Personal Care"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the care plan..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Input
                    id="frequency"
                    value={formData.frequency}
                    onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                    placeholder="e.g., Daily, 3x/week"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="goals">Goals</Label>
                <Textarea
                  id="goals"
                  value={formData.goals}
                  onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
                  placeholder="What are the goals of this care plan?"
                  rows={2}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  Add Care Plan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {carePlans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Care Plans Yet</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Create a care plan to define the services and goals for this client.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {carePlans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{plan.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${getStatusColor(plan.status)}`}>
                          {plan.status}
                        </span>
                        {plan.frequency && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {plan.frequency}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(plan.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.description && (
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm">
                  {(plan.start_date || plan.end_date) && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {formatDate(plan.start_date)} - {formatDate(plan.end_date)}
                    </div>
                  )}
                </div>
                {plan.goals && (
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-primary mt-0.5" />
                    <p className="text-sm text-muted-foreground">{plan.goals}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
