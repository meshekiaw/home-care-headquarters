import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLmsCourses } from "@/hooks/useLmsCourses";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddCourseDialog({ open, onOpenChange }: Props) {
  const { addCourse } = useLmsCourses();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState("text");
  const [contentUrl, setContentUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [category, setCategory] = useState("orientation");
  const [passingScore, setPassingScore] = useState("80");
  const [isRequired, setIsRequired] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await addCourse({
      title: title.trim(),
      description: description.trim() || null,
      content_type: contentType,
      content_url: contentUrl.trim() || null,
      duration_minutes: duration ? parseInt(duration) : null,
      category,
      passing_score: parseInt(passingScore) || 80,
      is_required: isRequired,
    });
    setSaving(false);
    setTitle(""); setDescription(""); setContentUrl(""); setDuration("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Course</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Course Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. HIPAA Training" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Course description..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Content Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="link">External Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="orientation">Orientation</SelectItem>
                  <SelectItem value="in-service">In-Service</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="clinical">Clinical Skills</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(contentType === "pdf" || contentType === "video" || contentType === "link") && (
            <div>
              <Label>Content URL</Label>
              <Input value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} placeholder="https://..." />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Duration (minutes)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="30" />
            </div>
            <div>
              <Label>Passing Score (%)</Label>
              <Input type="number" value={passingScore} onChange={(e) => setPassingScore(e.target.value)} placeholder="80" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isRequired} onCheckedChange={setIsRequired} />
            <Label>Required for all caregivers</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} loading={saving} disabled={!title.trim()}>Create Course</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
