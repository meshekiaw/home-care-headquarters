import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff, Lock } from "lucide-react";
import type { InServiceSession } from "@/hooks/useInServiceSessions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: InServiceSession | null;
  onSave: (
    courseId: string,
    updates: {
      title: string;
      description: string | null;
      duration_minutes: number | null;
      passing_score: number;
      videoUrl: string;
    }
  ) => Promise<boolean>;
}

export default function SessionEditDialog({ open, onOpenChange, session, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [passingScore, setPassingScore] = useState("70");
  const [videoUrl, setVideoUrl] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !session) return;
    setTitle(session.title);
    setDescription(session.description ?? "");
    setDuration(session.duration_minutes ? String(session.duration_minutes) : "");
    setPassingScore(String(session.passing_score ?? 70));
    setVideoUrl(session.video_url ?? "");
    setShowUrl(false);
  }, [open, session]);

  const handleSave = async () => {
    if (!session || !title.trim()) return;
    setSaving(true);
    const ok = await onSave(session.id, {
      title: title.trim(),
      description: description.trim() || null,
      duration_minutes: duration ? parseInt(duration, 10) : null,
      passing_score: Math.min(100, Math.max(1, parseInt(passingScore, 10) || 70)),
      videoUrl,
    });
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Session {session?.session_number}</DialogTitle>
          <DialogDescription>
            Paste the video link whenever the session is produced. Caregivers never see the link itself.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" /> YouTube link (admins only)
            </Label>
            <div className="flex gap-2">
              <Input
                type={showUrl ? "text" : "password"}
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtu.be/..."
                autoComplete="off"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => setShowUrl((v) => !v)} aria-label={showUrl ? "Hide link" : "Show link"}>
                {showUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to remove the video. Unlisted videos are fine; the video plays inside the training page.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Length (minutes)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="30" />
            </div>
            <div>
              <Label>Passing score (%)</Label>
              <Input type="number" min={1} max={100} value={passingScore} onChange={(e) => setPassingScore(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">70% = 4 of 5 correct.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!title.trim()}>Save session</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
