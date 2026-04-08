import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface EditSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: { id: string; title: string; content: string } | null;
  onSave: (id: string, title: string, content: string) => void;
}

export default function EditSectionDialog({ open, onOpenChange, section, onSave }: EditSectionDialogProps) {
  const [title, setTitle] = useState(section?.title || "");
  const [content, setContent] = useState(section?.content || "");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && section) {
      setTitle(section.title);
      setContent(section.content);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Section</DialogTitle>
          <DialogDescription>Update the orientation section title and content.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Content (HTML)</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
              className="font-mono text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { if (section) onSave(section.id, title, content); onOpenChange(false); }}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
