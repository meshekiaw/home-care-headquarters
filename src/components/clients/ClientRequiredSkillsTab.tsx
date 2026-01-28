import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { 
  Plus, 
  Target, 
  Trash2, 
  Award, 
  Sparkles,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { useClientRequiredSkills, useSkillMatching } from "@/hooks/useSkillMatching";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ClientRequiredSkillsTabProps {
  clientId: string;
}

const COMMON_SKILLS = [
  "Mobility Assistance",
  "Medication Management",
  "Personal Hygiene Care",
  "Meal Preparation",
  "Dementia Care",
  "Alzheimer's Care",
  "Wound Care",
  "Physical Therapy Support",
  "Companionship",
  "Transportation",
  "Housekeeping",
  "First Aid",
  "CPR",
  "Diabetic Care",
  "Respiratory Care",
  "Palliative Care",
  "Post-Surgical Care",
  "Memory Care",
];

export function ClientRequiredSkillsTab({ clientId }: ClientRequiredSkillsTabProps) {
  const { toast } = useToast();
  const { requiredSkills, loading: skillsLoading, addRequiredSkill, removeRequiredSkill } = useClientRequiredSkills(clientId);
  const { matchedCaregivers, loading: matchingLoading, refetch: refetchMatches } = useSkillMatching(clientId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customSkill, setCustomSkill] = useState("");
  const [formData, setFormData] = useState({
    skill_name: "",
    priority: "required",
    minimum_proficiency: "intermediate",
    requires_certification: false,
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const skillName = formData.skill_name === "custom" ? customSkill : formData.skill_name;
    if (!skillName) {
      toast({ title: "Please select or enter a skill", variant: "destructive" });
      setSaving(false);
      return;
    }

    const success = await addRequiredSkill({
      skill_name: skillName,
      priority: formData.priority,
      minimum_proficiency: formData.minimum_proficiency,
      requires_certification: formData.requires_certification,
      notes: formData.notes || null,
    });

    if (success) {
      setDialogOpen(false);
      setFormData({
        skill_name: "",
        priority: "required",
        minimum_proficiency: "intermediate",
        requires_certification: false,
        notes: "",
      });
      setCustomSkill("");
      refetchMatches();
    }
    setSaving(false);
  };

  const handleAssignCaregiver = async (caregiverId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in");

      // Check if already assigned
      const { data: existing } = await supabase
        .from('client_caregivers')
        .select('id, is_active')
        .eq('client_id', clientId)
        .eq('caregiver_id', caregiverId)
        .maybeSingle();

      if (existing?.is_active) {
        toast({ title: "Caregiver already assigned to this client", variant: "destructive" });
        return;
      }

      if (existing && !existing.is_active) {
        // Reactivate existing assignment
        await supabase
          .from('client_caregivers')
          .update({ is_active: true })
          .eq('id', existing.id);
      } else {
        // Create new assignment
        await supabase.from('client_caregivers').insert([{
          client_id: clientId,
          caregiver_id: caregiverId,
          user_id: user.id,
          role: 'primary',
          is_active: true,
        }]);
      }

      toast({ title: "Caregiver assigned successfully!" });
    } catch (error: any) {
      toast({
        title: "Error assigning caregiver",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'required':
        return <Badge variant="destructive" className="text-xs">Required</Badge>;
      case 'preferred':
        return <Badge variant="default" className="text-xs">Preferred</Badge>;
      case 'nice_to_have':
        return <Badge variant="secondary" className="text-xs">Nice to Have</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{priority}</Badge>;
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getMatchScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    if (score >= 40) return "bg-orange-100";
    return "bg-red-100";
  };

  return (
    <div className="space-y-6">
      {/* Required Skills Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Care Requirements
            </h3>
            <p className="text-sm text-muted-foreground">Define the skills needed for this client's care</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Requirement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Care Requirement</DialogTitle>
                <DialogDescription>Specify a skill or certification needed for this client</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="skill_name">Skill *</Label>
                  <Select 
                    value={formData.skill_name} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, skill_name: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a skill" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_SKILLS.map((skill) => (
                        <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                      ))}
                      <SelectItem value="custom">+ Custom Skill</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.skill_name === "custom" && (
                    <Input
                      value={customSkill}
                      onChange={(e) => setCustomSkill(e.target.value)}
                      placeholder="Enter custom skill name"
                      className="mt-2"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={formData.priority} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="required">Required</SelectItem>
                        <SelectItem value="preferred">Preferred</SelectItem>
                        <SelectItem value="nice_to_have">Nice to Have</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minimum_proficiency">Min. Proficiency</Label>
                    <Select 
                      value={formData.minimum_proficiency} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, minimum_proficiency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label htmlFor="requires_certification">Requires Certification</Label>
                    <p className="text-xs text-muted-foreground">Caregiver must have certification for this skill</p>
                  </div>
                  <Switch
                    id="requires_certification"
                    checked={formData.requires_certification}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_certification: checked }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any additional requirements or context..."
                    rows={2}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    Add Requirement
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {skillsLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        ) : requiredSkills.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-medium mb-1">No Requirements Defined</h4>
              <p className="text-sm text-muted-foreground max-w-sm">
                Add care requirements to find caregivers with matching skills.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-wrap gap-2">
            {requiredSkills.map((skill) => (
              <div 
                key={skill.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{skill.skill_name}</span>
                    {skill.requires_certification && (
                      <Award className="w-3.5 h-3.5 text-primary" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(skill.priority)}
                    <Badge variant="outline" className="text-xs capitalize">
                      {skill.minimum_proficiency || 'Intermediate'}+
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    removeRequiredSkill(skill.id);
                    refetchMatches();
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Caregivers Section */}
      {requiredSkills.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Suggested Caregivers
            </h3>
            <p className="text-sm text-muted-foreground">Caregivers ranked by skill match</p>
          </div>

          {matchingLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : matchedCaregivers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-muted-foreground" />
                </div>
                <h4 className="font-medium mb-1">No Matching Caregivers</h4>
                <p className="text-sm text-muted-foreground max-w-sm">
                  No caregivers have skills matching the requirements. Try adding more caregivers or adjusting requirements.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {matchedCaregivers.slice(0, 6).map((caregiver) => (
                <Card key={caregiver.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {caregiver.first_name.charAt(0)}{caregiver.last_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {caregiver.first_name} {caregiver.last_name}
                          </p>
                          {caregiver.hourly_rate && (
                            <p className="text-xs text-muted-foreground">
                              ${caregiver.hourly_rate}/hr
                            </p>
                          )}
                        </div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-sm font-semibold ${getMatchScoreBg(caregiver.matchScore)} ${getMatchScoreColor(caregiver.matchScore)}`}>
                        {caregiver.matchScore}%
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {caregiver.matchedSkills.length > 0 && (
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                          <div className="flex flex-wrap gap-1">
                            {caregiver.matchedSkills.map((skill, i) => (
                              <Badge key={i} variant="secondary" className="text-xs bg-green-100 text-green-700">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {caregiver.partialMatches.length > 0 && (
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                          <div className="flex flex-wrap gap-1">
                            {caregiver.partialMatches.map((skill, i) => (
                              <Badge key={i} variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {caregiver.missingSkills.length > 0 && (
                        <div className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                          <div className="flex flex-wrap gap-1">
                            {caregiver.missingSkills.map((skill, i) => (
                              <Badge key={i} variant="secondary" className="text-xs bg-red-100 text-red-600">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t">
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleAssignCaregiver(caregiver.id)}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Assign Caregiver
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
