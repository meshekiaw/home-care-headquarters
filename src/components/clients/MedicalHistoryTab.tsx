import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Stethoscope, Calendar, AlertTriangle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MedicalRecord {
  id: string;
  condition_name: string;
  diagnosis_date: string | null;
  notes: string | null;
  severity: string | null;
  is_current: boolean | null;
  created_at: string;
}

interface MedicalHistoryTabProps {
  clientId: string;
}

export function MedicalHistoryTab({ clientId }: MedicalHistoryTabProps) {
  const { toast } = useToast();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    condition_name: "",
    diagnosis_date: "",
    notes: "",
    severity: "moderate",
    is_current: true,
  });

  useEffect(() => {
    fetchMedicalHistory();
  }, [clientId]);

  async function fetchMedicalHistory() {
    try {
      const { data, error } = await supabase
        .from('medical_history')
        .select('*')
        .eq('client_id', clientId)
        .order('is_current', { ascending: false })
        .order('diagnosis_date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading medical history",
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

      const { error } = await supabase.from('medical_history').insert([{
        client_id: clientId,
        user_id: user.id,
        condition_name: formData.condition_name,
        diagnosis_date: formData.diagnosis_date || null,
        notes: formData.notes || null,
        severity: formData.severity,
        is_current: formData.is_current,
      }]);

      if (error) throw error;

      toast({ title: "Medical record added successfully!" });
      setDialogOpen(false);
      setFormData({
        condition_name: "",
        diagnosis_date: "",
        notes: "",
        severity: "moderate",
        is_current: true,
      });
      fetchMedicalHistory();
    } catch (error: any) {
      toast({
        title: "Error adding medical record",
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
        .from('medical_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Medical record deleted successfully!" });
      fetchMedicalHistory();
    } catch (error: any) {
      toast({
        title: "Error deleting medical record",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  const getSeverityColor = (severity: string | null) => {
    switch (severity) {
      case 'mild': return 'bg-success/10 text-success';
      case 'moderate': return 'bg-warning/10 text-warning';
      case 'severe': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Unknown';
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

  const currentConditions = records.filter(r => r.is_current);
  const pastConditions = records.filter(r => !r.is_current);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Medical History</h3>
          <p className="text-sm text-muted-foreground">Track medical conditions and history</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Condition
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Medical Condition</DialogTitle>
              <DialogDescription>Record a medical condition for this client</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="condition_name">Condition Name *</Label>
                <Input
                  id="condition_name"
                  value={formData.condition_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, condition_name: e.target.value }))}
                  placeholder="e.g., Type 2 Diabetes"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="diagnosis_date">Diagnosis Date</Label>
                  <Input
                    id="diagnosis_date"
                    type="date"
                    value={formData.diagnosis_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, diagnosis_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity</Label>
                  <Select 
                    value={formData.severity} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mild">Mild</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="severe">Severe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional details about the condition..."
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_current"
                  checked={formData.is_current}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, is_current: checked === true }))
                  }
                />
                <Label htmlFor="is_current" className="text-sm font-normal">
                  This is a current/ongoing condition
                </Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  Add Condition
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Stethoscope className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Medical History</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Add medical conditions to maintain a complete health record.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {currentConditions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Current Conditions ({currentConditions.length})
              </h4>
              <div className="grid gap-3">
                {currentConditions.map((record) => (
                  <Card key={record.id}>
                    <CardContent className="flex items-start justify-between p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                          <p className="font-medium">{record.condition_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${getSeverityColor(record.severity)}`}>
                              {record.severity}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Diagnosed: {formatDate(record.diagnosis_date)}
                            </span>
                          </div>
                          {record.notes && (
                            <p className="text-sm text-muted-foreground mt-2">{record.notes}</p>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(record.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {pastConditions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Past Conditions ({pastConditions.length})
              </h4>
              <div className="grid gap-3">
                {pastConditions.map((record) => (
                  <Card key={record.id} className="opacity-75">
                    <CardContent className="flex items-start justify-between p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Stethoscope className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{record.condition_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">Resolved</Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(record.diagnosis_date)}
                            </span>
                          </div>
                          {record.notes && (
                            <p className="text-sm text-muted-foreground mt-2">{record.notes}</p>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(record.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
