import { CheckCircle2, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const STEP_COLORS = [
  { bar: "bg-blue-500", text: "text-blue-600" },
  { bar: "bg-purple-500", text: "text-purple-600" },
  { bar: "bg-teal-500", text: "text-teal-600" },
  { bar: "bg-rose-500", text: "text-rose-600" },
  { bar: "bg-amber-500", text: "text-amber-600" },
  { bar: "bg-emerald-500", text: "text-emerald-600" },
  { bar: "bg-indigo-500", text: "text-indigo-600" },
  { bar: "bg-sky-500", text: "text-sky-600" },
];

interface OrientationProgressBarProps {
  totalSections: number;
  currentSection: number;
  completedSections: number[];
  quizScores?: Record<string, number>;
  passingScore?: number;
}

export default function OrientationProgressBar({
  totalSections,
  currentSection,
  completedSections,
  quizScores = {},
  passingScore = 70,
}: OrientationProgressBarProps) {
  const passedQuizzes = Object.values(quizScores).filter((s) => s >= passingScore).length;
  const quizPct = totalSections > 0 ? Math.round((passedQuizzes / totalSections) * 100) : 0;
  const sectionPct = totalSections > 0 ? Math.round((completedSections.length / totalSections) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 w-full">
        {Array.from({ length: totalSections }, (_, i) => {
          const sectionNum = i + 1;
          const isCompleted = completedSections.includes(sectionNum);
          const isCurrent = currentSection === sectionNum;
          const score = quizScores[String(sectionNum)];
          const quizPassed = typeof score === "number" && score >= passingScore;
          const color = STEP_COLORS[i % STEP_COLORS.length];
          return (
            <div key={sectionNum} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-full h-2.5 rounded-full transition-all",
                  isCompleted ? color.bar : isCurrent ? cn(color.bar, "opacity-60") : "bg-secondary"
                )}
              />
              <div
                className={cn(
                  "w-full h-1.5 rounded-full transition-all",
                  quizPassed ? "bg-emerald-500" : "bg-secondary"
                )}
                title={typeof score === "number" ? `Quiz score: ${score}%` : "Quiz not passed"}
              />
              <div className="flex items-center gap-1">
                {isCompleted && <CheckCircle2 className={cn("w-3.5 h-3.5", color.text)} />}
                <span className={cn("text-xs", isCurrent ? cn("font-bold", color.text) : "text-muted-foreground")}>
                  {sectionNum}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
          Sections: {completedSections.length}/{totalSections} ({sectionPct}%)
        </span>
        <span className="flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />
          Quizzes passed ({passingScore}%+): {passedQuizzes}/{totalSections} ({quizPct}%)
        </span>
      </div>
    </div>
  );
}
