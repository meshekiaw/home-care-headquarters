import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface QuizQuestion {
  id?: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  points: number;
}

interface AddQuizQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionNumber: number;
  onSave: (question: { question_text: string; options: string[]; correct_answer: string; points: number }) => void;
  editQuestion?: QuizQuestion | null;
}

export default function AddQuizQuestionDialog({ open, onOpenChange, sectionNumber, onSave, editQuestion }: AddQuizQuestionDialogProps) {
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [points, setPoints] = useState(10);

  useEffect(() => {
    if (open) {
      if (editQuestion) {
        setQuestionText(editQuestion.question_text);
        const opts = [...(editQuestion.options || [])];
        while (opts.length < 4) opts.push("");
        setOptions(opts.slice(0, 4));
        setCorrectAnswer(editQuestion.correct_answer);
        setPoints(editQuestion.points);
      } else {
        setQuestionText("");
        setOptions(["", "", "", ""]);
        setCorrectAnswer("");
        setPoints(10);
      }
    }
  }, [open, editQuestion]);

  const updateOption = (index: number, value: string) => {
    const newOpts = [...options];
    newOpts[index] = value;
    setOptions(newOpts);
  };

  const handleSave = () => {
    if (!questionText.trim() || !correctAnswer) return;
    const filledOptions = options.filter((o) => o.trim());
    if (filledOptions.length < 2) return;
    onSave({ question_text: questionText, options: filledOptions, correct_answer: correctAnswer, points });
    onOpenChange(false);
  };

  const isValid = questionText.trim() && correctAnswer && options.filter((o) => o.trim()).length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editQuestion ? "Edit" : "Add"} Quiz Question — Section {sectionNumber}</DialogTitle>
          <DialogDescription>
            {editQuestion ? "Update the quiz question details." : "Add a new multiple-choice question for this section."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Question</Label>
            <Input value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Enter question text" />
          </div>
          <div className="space-y-2">
            <Label>Options</Label>
            {options.map((opt, i) => (
              <Input
                key={i}
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
              />
            ))}
          </div>
          <div>
            <Label>Correct Answer</Label>
            <RadioGroup value={correctAnswer} onValueChange={setCorrectAnswer} className="space-y-1">
              {options.filter((o) => o.trim()).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <RadioGroupItem value={opt} id={`correct-${i}`} />
                  <Label htmlFor={`correct-${i}`} className="font-normal">{opt}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label>Points</Label>
            <Input type="number" min={1} value={points} onChange={(e) => setPoints(parseInt(e.target.value) || 1)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {editQuestion ? "Save Changes" : "Add Question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
