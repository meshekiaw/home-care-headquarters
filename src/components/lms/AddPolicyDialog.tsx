import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLmsPolicies } from "@/hooks/useLmsPolicies";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddPolicyDialog({ open, onOpenChange }: Props) {
  const { addPolicy } = useLmsPolicies();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [requiresAck, setRequiresAck] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    await addPolicy({
      title: title.trim(),
      description: description.trim() || null,
      content: content.trim(),
      category,
      requires_acknowledgment: requiresAck,
    });
    setSaving(false);
    setTitle(""); setDescription(""); setContent("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Policy</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Policy Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. HIPAA Privacy Policy" />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief summary..." />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="hipaa">HIPAA</SelectItem>
                <SelectItem value="safety">Safety</SelectItem>
                <SelectItem value="conduct">Code of Conduct</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Policy Content *</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter the full policy text here..."
              rows={12}
              className="font-mono text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={requiresAck} onCheckedChange={setRequiresAck} />
            <Label>Requires staff acknowledgment</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} loading={saving} disabled={!title.trim() || !content.trim()}>
              Create Policy
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
