import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Briefcase, Trash2, Edit, Award } from "lucide-react";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

interface SkillsTabProps {
  skills: Tables<"caregiver_skills">[];
  onAdd: (skill: Omit<TablesInsert<"caregiver_skills">, "user_id" | "caregiver_id">) => Promise<any>;
  onUpdate: (id: string, updates: TablesUpdate<"caregiver_skills">) => Promise<any>;
  onDelete: (id: string) => Promise<boolean>;
}

const PROFICIENCY_LEVELS = [
  { value: "beginner", label: "Beginner", color: "bg-muted text-muted-foreground" },
  { value: "intermediate", label: "Intermediate", color: "bg-primary/20 text-primary" },
  { value: "advanced", label: "Advanced", color: "bg-success/20 text-success" },
  { value: "expert", label: "Expert", color: "bg-warning/20 text-warning" },
];

const COMMON_SKILLS = [
  "Medication Management",
  "Wound Care",
  "Physical Therapy Assistance",
  "Dementia Care",
  "Alzheimer's Care",
  "Diabetes Management",
  "Mobility Assistance",
  "Personal Hygiene",
  "Meal Preparation",
  "Companionship",
  "Light Housekeeping",
  "Transportation",
  "Vital Signs Monitoring",
  "Oxygen Therapy",
  "Catheter Care",
  "Ostomy Care",
  "Pediatric Care",
  "Post-Surgical Care",
  "Hospice Care",
  "Palliative Care",
];

export default function SkillsTab({ skills, onAdd, onUpdate, onDelete }: SkillsTabProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Tables<"caregiver_skills"> | null>(null);
  const [formData, setFormData] = useState({
    skill_name: "",
    proficiency_level: "intermediate",
    years_experience: "",
    is_certified: false,
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      skill_name: "",
      proficiency_level: "intermediate",
      years_experience: "",
      is_certified: false,
      notes: "",
    });
  };

  const handleAdd = async () => {
    await onAdd({
      skill_name: formData.skill_name,
      proficiency_level: formData.proficiency_level,
      years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
      is_certified: formData.is_certified,
      notes: formData.notes || null,
    });
    resetForm();
    setAddDialogOpen(false);
  };

  const handleEdit = (skill: Tables<"caregiver_skills">) => {
    setEditingSkill(skill);
    setFormData({
      skill_name: skill.skill_name,
      proficiency_level: skill.proficiency_level,
      years_experience: skill.years_experience?.toString() || "",
      is_certified: skill.is_certified || false,
      notes: skill.notes || "",
    });
  };

  const handleUpdate = async () => {
    if (!editingSkill) return;
    await onUpdate(editingSkill.id, {
      skill_name: formData.skill_name,
      proficiency_level: formData.proficiency_level,
      years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
      is_certified: formData.is_certified,
      notes: formData.notes || null,
    });
    setEditingSkill(null);
    resetForm();
  };

  const getProficiencyColor = (level: string) => {
    return PROFICIENCY_LEVELS.find((l) => l.value === level)?.color || "";
  };

  const SkillForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Skill Name *</Label>
        <div className="space-y-2">
          <Input
            value={formData.skill_name}
            onChange={(e) => setFormData((f) => ({ ...f, skill_name: e.target.value }))}
            placeholder="Enter skill name or select below"
          />
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border rounded-lg bg-muted/50">
            {COMMON_SKILLS.filter(
              (s) => !skills.some((existing) => existing.skill_name.toLowerCase() === s.toLowerCase())
            ).map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => setFormData((f) => ({ ...f, skill_name: skill }))}
              >
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Proficiency Level</Label>
          <Select
            value={formData.proficiency_level}
            onValueChange={(v) => setFormData((f) => ({ ...f, proficiency_level: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROFICIENCY_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Years of Experience</Label>
          <Input
            type="number"
            min="0"
            value={formData.years_experience}
            onChange={(e) => setFormData((f) => ({ ...f, years_experience: e.target.value }))}
            placeholder="e.g., 5"
          />
        </div>
      </div>
      <div className="flex items-center justify-between py-2">
        <div className="space-y-0.5">
          <Label>Certified in this skill</Label>
          <p className="text-xs text-muted-foreground">Has formal certification or training</p>
        </div>
        <Switch
          checked={formData.is_certified}
          onCheckedChange={(checked) => setFormData((f) => ({ ...f, is_certified: checked }))}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Track skills for better client matching
        </p>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Skill
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Skill</DialogTitle>
            </DialogHeader>
            <SkillForm />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={!formData.skill_name}>
                Add Skill
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingSkill} onOpenChange={(open) => !open && setEditingSkill(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Skill</DialogTitle>
          </DialogHeader>
          <SkillForm />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditingSkill(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.skill_name}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {skills.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No skills added yet</h3>
            <p className="text-sm text-muted-foreground">
              Add skills to enable better client matching
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {skills.map((skill) => (
            <Card key={skill.id} className="hover:shadow-soft transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">{skill.skill_name}</h4>
                        {skill.is_certified && (
                          <Award className="w-4 h-4 text-success" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge className={`text-xs ${getProficiencyColor(skill.proficiency_level)}`}>
                          {skill.proficiency_level}
                        </Badge>
                        {skill.years_experience && (
                          <span className="text-xs text-muted-foreground">
                            {skill.years_experience} years
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(skill)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Skill</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove "{skill.skill_name}"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(skill.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
