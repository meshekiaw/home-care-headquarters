import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizQuestion {
  id: string;
  question_text: string;
  options: string[];
  points: number;
}

interface QuizResult {
  correct: boolean;
  correct_answer: string;
}

interface OrientationQuizProps {
  sectionNumber: number;
  questions: QuizQuestion[];
  passingScore: number;
  onPass: (score: number) => void;
  onFail: () => void;
  gradeQuiz: (sectionNumber: number, answers: Record<string, string>) => Promise<{
    score: number;
    passed: boolean;
    results: Record<string, QuizResult>;
  }>;
}

export default function OrientationQuiz({ sectionNumber, questions, passingScore, onPass, onFail, gradeQuiz }: OrientationQuizProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<Record<string, QuizResult>>({});

  const handleSelect = (questionId: string, option: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await gradeQuiz(sectionNumber, answers);
      setScore(response.score);
      setResults(response.results);
      setSubmitted(true);
      if (response.passed) {
        onPass(response.score);
      } else {
        onFail();
      }
    } catch {
      // Error handled by the hook's toast
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(0);
    setResults({});
  };

  const allAnswered = questions.every((q) => answers[q.id]);

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Section {sectionNumber} Quiz</CardTitle>
          <Badge variant="secondary">{questions.length} Questions • Pass: {passingScore}%</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((q, qIdx) => (
          <div key={q.id} className="space-y-2">
            <p className="font-medium text-sm">
              {qIdx + 1}. {q.question_text}
            </p>
            <div className="grid gap-2">
              {q.options.map((opt) => {
                const isSelected = answers[q.id] === opt;
                const result = results[q.id];
                const isCorrect = result?.correct_answer === opt;
                let variant: "outline" | "default" | "destructive" | "secondary" = "outline";
                if (submitted && result) {
                  if (isCorrect) variant = "default";
                  else if (isSelected && !isCorrect) variant = "destructive";
                }
                return (
                  <Button
                    key={opt}
                    variant={!submitted && isSelected ? "secondary" : variant}
                    className={cn(
                      "justify-start text-left h-auto py-2 px-3 whitespace-normal",
                      !submitted && isSelected && "ring-2 ring-primary"
                    )}
                    onClick={() => handleSelect(q.id, opt)}
                    disabled={submitted || submitting}
                  >
                    {submitted && result && isCorrect && <CheckCircle2 className="w-4 h-4 mr-2 text-success shrink-0" />}
                    {submitted && result && isSelected && !isCorrect && <XCircle className="w-4 h-4 mr-2 text-destructive shrink-0" />}
                    <span className="text-sm">{opt}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        ))}

        {submitted ? (
          <div className={cn("p-4 rounded-lg", score >= passingScore ? "bg-success/10" : "bg-destructive/10")}>
            <div className="flex items-center gap-2 mb-2">
              {score >= passingScore ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              )}
              <span className="font-semibold">
                Score: {score}% {score >= passingScore ? "— Passed!" : `— Required: ${passingScore}%`}
              </span>
            </div>
            {score < passingScore && (
              <Button variant="outline" size="sm" onClick={handleRetry} className="mt-2">
                Retry Quiz
              </Button>
            )}
          </div>
        ) : (
          <Button onClick={handleSubmit} disabled={!allAnswered || submitting} className="w-full">
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Quiz
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
