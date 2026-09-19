import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link2, Pencil, ListChecks, Video, VideoOff, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useInServiceSessions, sessionShareUrl, type InServiceSession } from "@/hooks/useInServiceSessions";
import SessionEditDialog from "./SessionEditDialog";
import SessionQuizDialog from "./SessionQuizDialog";

export default function InServiceSessionsTab() {
  const { sessions, loading, saveSession, refetch } = useInServiceSessions();
  const { toast } = useToast();
  const [editing, setEditing] = useState<InServiceSession | null>(null);
  const [quizFor, setQuizFor] = useState<InServiceSession | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const copyLink = async (s: InServiceSession) => {
    const url = sessionShareUrl(s.session_number);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(s.session_number);
      setTimeout(() => setCopied(null), 2000);
      toast({ title: "Link copied", description: url });
    } catch {
      toast({ title: "Copy the link manually", description: url });
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          Twelve annual in-service sessions. Paste a video link as each one is produced — caregivers watch it
          inside the training page and never see the link. Share links point to your app and send people
          through sign-in first.
        </CardContent>
      </Card>

      <div className="space-y-3">
        {sessions.map((s) => (
          <Card key={s.id}>
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-semibold shrink-0">
                  {s.session_number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold">{s.title}</h4>
                    {s.video_id ? (
                      <Badge className="bg-success/10 text-success border-success/20">
                        <Video className="w-3 h-3 mr-1" /> Video set
                      </Badge>
                    ) : (
                      <Badge variant="secondary"><VideoOff className="w-3 h-3 mr-1" /> No video yet</Badge>
                    )}
                    <Badge variant="outline">{s.question_count} quiz questions</Badge>
                    <Badge variant="outline">Pass {s.passing_score ?? 70}%</Badge>
                  </div>
                  {s.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{s.description}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setQuizFor(s)}>
                    <ListChecks className="w-4 h-4 mr-1" /> Quiz
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyLink(s)}>
                    {copied === s.session_number ? <Check className="w-4 h-4 mr-1 text-success" /> : <Link2 className="w-4 h-4 mr-1" />}
                    Share link
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SessionEditDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        session={editing}
        onSave={saveSession}
      />
      <SessionQuizDialog
        open={!!quizFor}
        onOpenChange={(o) => !o && setQuizFor(null)}
        session={quizFor}
        onChanged={refetch}
      />
    </div>
  );
}
