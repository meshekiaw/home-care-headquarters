import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyError } from "@/lib/friendlyError";
import type { InServiceSession } from "@/hooks/useInServiceSessions";

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  points: number;
  sort_order: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: InServiceSession | null;
  onChanged?: () => void;
}

export default function SessionQuizDialog({ open, onOpenChange, session, onChanged }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Question | "new" | null>(null);
  const [text, setText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("lms_quiz_questions")
      .select("id, question_text, options, correct_answer, points, sort_order")
      .eq("course_id", session.id)
      .order("sort_order", { ascending: true });
    if (error) {
      toast({ title: "Error loading quiz", description: friendlyError(error), variant: "destructive" });
    } else {
      setQuestions(
        (data || []).map((q: any) => ({ ...q, options: Array.isArray(q.options) ? q.options : [] }))
      );
    }
    setLoading(false);
  }, [session, toast]);

  useEffect(() => {
    if (open) { setEditing(null); load(); }
  }, [open, load]);

  const startEdit = (q: Question | "new") => {
    setEditing(q);
    if (q === "new") {
      setText(""); setOptions(["", "", "", ""]); setCorrect("");
    } else {
      setText(q.question_text);
      const o = [...q.options];
      while (o.length < 4) o.push("");
      setOptions(o.slice(0, 4));
      setCorrect(q.correct_answer);
    }
  };

  const save = async () => {
    if (!session || !user) return;
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!text.trim() || opts.length < 2 || !correct.trim() || !opts.includes(correct.trim())) {
      toast({
        title: "Check the question",
        description: "Enter the question, at least two answers, and mark which one is correct.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const payload = {
      question_text: text.trim(),
      options: opts,
      correct_answer: correct.trim(),
      points: 1,
    };
    let error;
    if (editing === "new") {
      const nextOrder = (questions.at(-1)?.sort_order ?? 0) + 1;
      ({ error } = await supabase.from("lms_quiz_questions").insert({
        ...payload,
        question_type: "multiple_choice",
        sort_order: nextOrder,
        course_id: session.id,
        user_id: user.id,
      } as any));
    } else if (editing) {
      ({ error } = await supabase.from("lms_quiz_questions").update(payload as any).eq("id", editing.id));
    }
    setSaving(false);
    if (error) {
      toast({ title: "Could not save question", description: friendlyError(error), variant: "destructive" });
      return;
    }
    toast({ title: "Question saved" });
    setEditing(null);
    await load();
    onChanged?.();
  };

  const remove = async (q: Question) => {
    if (!window.confirm("Delete this question? This cannot be undone.")) return;
    const { error } = await supabase.from("lms_quiz_questions").delete().eq("id", q.id);
    if (error) {
      toast({ title: "Could not delete question", description: friendlyError(error), variant: "destructive" });
      return;
    }
    toast({ title: "Question deleted" });
    await load();
    onChanged?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quiz — Session {session?.session_number}: {session?.title}</DialogTitle>
          <DialogDescription>
            Passing score for this session is {session?.passing_score ?? 70}%. Answers are checked on the server, never in the caregiver's browser.
          </DialogDescription>
        </DialogHeader>

        {editing ? (
          <div className="space-y-4">
            <div>
              <Label>Question</Label>
              <Input value={text} onChange={(e) => setText(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Answers — select the correct one</Label>
              <RadioGroup value={correct} onValueChange={setCorrect}>
                {options.map((o, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <RadioGroupItem value={o} id={`opt-${i}`} disabled={!o.trim()} />
                    <Input
                      value={o}
                      placeholder={`Answer ${i + 1}`}
                      onChange={(e) => {
                        const next = [...options];
                        const old = next[i];
                        next[i] = e.target.value;
                        setOptions(next);
                        if (correct === old) setCorrect(e.target.value);
                      }}
                    />
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
              <Button onClick={save} loading={saving}>Save question</Button>
            </div>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" />
          </div>
        ) : (
          <div className="space-y-3">
            {questions.length === 0 && (
              <p className="text-sm text-muted-foreground">No questions yet for this session.</p>
            )}
            {questions.map((q, idx) => (
              <div key={q.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-sm">{idx + 1}. {q.question_text}</p>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(q)} aria-label="Edit question">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(q)} aria-label="Delete question">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {q.options.map((o, i) => (
                    <li key={i} className="flex items-center gap-2">
                      {o === q.correct_answer ? <Check className="w-3.5 h-3.5 text-success" /> : <span className="w-3.5" />}
                      <span className={o === q.correct_answer ? "text-foreground" : ""}>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <Button variant="outline" onClick={() => startEdit("new")}>
              <Plus className="w-4 h-4 mr-1" /> Add question
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
