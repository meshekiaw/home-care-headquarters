import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrientationProgressBarProps {
  totalSections: number;
  currentSection: number;
  completedSections: number[];
}

export default function OrientationProgressBar({ totalSections, currentSection, completedSections }: OrientationProgressBarProps) {
  return (
    <div className="flex items-center gap-1 w-full">
      {Array.from({ length: totalSections }, (_, i) => {
        const sectionNum = i + 1;
        const isCompleted = completedSections.includes(sectionNum);
        const isCurrent = currentSection === sectionNum;
        return (
          <div key={sectionNum} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={cn(
                "w-full h-2 rounded-full transition-all",
                isCompleted ? "bg-success" : isCurrent ? "bg-primary" : "bg-secondary"
              )}
            />
            <div className="flex items-center gap-1">
              {isCompleted && <CheckCircle2 className="w-3 h-3 text-success" />}
              <span className={cn("text-xs", isCurrent ? "font-semibold text-primary" : "text-muted-foreground")}>
                {sectionNum}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
