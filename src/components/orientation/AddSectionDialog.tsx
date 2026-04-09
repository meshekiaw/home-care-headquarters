import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface AddSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (sectionNumber: number, title: string, content: string) => void;
  nextSectionNumber: number;
}

export default function AddSectionDialog({ open, onOpenChange, onSave, nextSectionNumber }: AddSectionDialogProps) {
  const [sectionNumber, setSectionNumber] = useState(nextSectionNumber);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setSectionNumber(nextSectionNumber);
      setTitle("");
      setContent("");
    }
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave(sectionNumber, title, content);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Section</DialogTitle>
          <DialogDescription>Create a new orientation section with title and content.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Section Number</Label>
            <Input type="number" min={1} value={sectionNumber} onChange={(e) => setSectionNumber(parseInt(e.target.value) || 1)} />
          </div>
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Section title" />
          </div>
          <div>
            <Label>Content (HTML)</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="font-mono text-xs"
              placeholder="<h3>Section content...</h3>"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim()}>Add Section</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
