import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EditSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: { id: string; title: string; content: string } | null;
  onSave: (id: string, title: string, content: string) => void;
}

export default function EditSectionDialog({ open, onOpenChange, section, onSave }: EditSectionDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (open && section) {
      setTitle(section.title);
      setContent(section.content);
    }
  }, [open, section]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Tabs defaultValue="editor">
            <TabsList>
              <TabsTrigger value="editor">HTML Editor</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="editor">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={15}
                className="font-mono text-xs"
              />
            </TabsContent>
            <TabsContent value="preview">
              <div
                className="prose prose-sm max-w-none border rounded-md p-4 min-h-[200px] bg-background"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </TabsContent>
          </Tabs>
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
