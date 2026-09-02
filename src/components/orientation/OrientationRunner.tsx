import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ArrowRight, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import OrientationProgressBar from "@/components/orientation/OrientationProgressBar";
import OrientationSection from "@/components/orientation/OrientationSection";
import OrientationQuiz from "@/components/orientation/OrientationQuiz";
import OrientationConfirmation from "@/components/orientation/OrientationConfirmation";
import { useOrientationModules, useOrientationQuizzes, useOrientationProgress } from "@/hooks/useOrientation";

export const ORIENTATION_PASSING_SCORE = 70;

interface OrientationRunnerProps {
  /** Caregiver id, or null for admin preview (nothing is saved). */
  caregiverId: string | null;
  caregiverName?: string;
  title?: string;
  subtitle?: string;
}

export default function OrientationRunner({
  caregiverId,
  caregiverName = "Caregiver",
  title,
  subtitle,
}: OrientationRunnerProps) {
  const isPreview = !caregiverId;
  const { modules, loading: modulesLoading } = useOrientationModules();
  const { quizzes, loading: quizzesLoading, gradeQuiz } = useOrientationQuizzes();
  const { progressList, upsertProgress } = useOrientationProgress();

  const progress = isPreview ? undefined : progressList.find((p) => p.caregiver_id === caregiverId);

  const [currentSection, setCurrentSection] = useState(1);
  const [audioCompleted, setAudioCompleted] = useState<Record<number, boolean>>({});
  const [localScores, setLocalScores] = useState<Record<string, number>>({});
  const [initialized, setInitialized] = useState(false);

  const totalSections = modules.length;
  const sectionsCompleted: number[] = isPreview ? [] : ((progress?.sections_completed as number[]) || []);
  const savedScores: Record<string, number> = isPreview ? {} : ((progress?.quiz_scores as Record<string, number>) || {});
  const quizScores = { ...savedScores, ...localScores };

  // Resume where the caregiver left off (once, after progress loads).
  useEffect(() => {
    if (!initialized && progress) {
      setCurrentSection(progress.current_section || 1);
      setInitialized(true);
    }
  }, [progress, initialized]);

  const currentModule = modules.find((m) => m.section_number === currentSection);
  const currentQuizQuestions = quizzes.filter((q) => q.section_number === currentSection);
  const isLastSection = currentSection === totalSections;

  const quizPassedFor = useCallback(
    (section: number) => {
      const hasQuiz = quizzes.some((q) => q.section_number === section);
      if (!hasQuiz) return true;
      const score = quizScores[String(section)];
      return typeof score === "number" && score >= ORIENTATION_PASSING_SCORE;
    },
    [quizzes, quizScores]
  );

  const currentQuizPassed = quizPassedFor(currentSection);
  const currentWatched = !!audioCompleted[currentSection] || sectionsCompleted.includes(currentSection);
  const canProceed = currentQuizPassed && (currentWatched || isPreview);

  const allSectionsWatched =
    totalSections > 0 && Array.from({ length: totalSections }, (_, i) => i + 1).every((s) => sectionsCompleted.includes(s));
  const allQuizzesPassed =
    totalSections > 0 && Array.from({ length: totalSections }, (_, i) => i + 1).every((s) => quizPassedFor(s));
  const canSign = allSectionsWatched && allQuizzesPassed;

  const handleAudioComplete = useCallback(() => {
    setAudioCompleted((prev) => ({ ...prev, [currentSection]: true }));
  }, [currentSection]);

  const handleQuizPass = async (score: number) => {
    setLocalScores((prev) => ({ ...prev, [String(currentSection)]: score }));
    if (isPreview || !caregiverId) return;
    const newCompleted = [...new Set([...sectionsCompleted, currentSection])];
    const newScores = { ...savedScores, ...localScores, [String(currentSection)]: score };
    await upsertProgress(caregiverId, {
      current_section: currentSection,
      sections_completed: newCompleted as any,
      quiz_scores: newScores as any,
    });
  };

  const handleNext = () => {
    if (!canProceed || currentSection >= totalSections) return;
    const next = currentSection + 1;
    setCurrentSection(next);
    if (!isPreview && caregiverId) {
      const newCompleted = [...new Set([...sectionsCompleted, currentSection])];
      upsertProgress(caregiverId, {
        current_section: next,
        sections_completed: newCompleted as any,
        quiz_scores: quizScores as any,
      });
    }
  };

  const handlePrev = () => {
    if (currentSection > 1) setCurrentSection(currentSection - 1);
  };

  const handleConfirm = async (signatureData: string) => {
    if (isPreview || !caregiverId) return;
    await upsertProgress(caregiverId, {
      completed_at: progress?.completed_at || new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
      signature_data: signatureData,
    });
  };

  if (modulesLoading || quizzesLoading) {
    return <Skeleton className="h-96" />;
  }

  if (totalSections === 0) {
    return (
      <p className="text-muted-foreground text-center py-12">
        No orientation content found. Please ask your administrator to set up the orientation.
      </p>
    );
  }

  const missingSections = Array.from({ length: totalSections }, (_, i) => i + 1).filter(
    (s) => !sectionsCompleted.includes(s)
  );
  const missingQuizzes = Array.from({ length: totalSections }, (_, i) => i + 1).filter((s) => !quizPassedFor(s));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">{title || "New Hire Orientation"}</h2>
        <p className="text-muted-foreground">
          {subtitle ||
            `Watch each section, then pass its quiz with ${ORIENTATION_PASSING_SCORE}% or higher to move forward.`}
        </p>
      </div>

      <OrientationProgressBar
        totalSections={totalSections}
        currentSection={currentSection}
        completedSections={sectionsCompleted}
        quizScores={quizScores}
        passingScore={ORIENTATION_PASSING_SCORE}
      />

      {isLastSection && canSign ? (
        <OrientationConfirmation
          caregiverName={caregiverName}
          totalSections={totalSections}
          onConfirm={handleConfirm}
          isConfirmed={!!progress?.confirmed_at}
        />
      ) : currentModule ? (
        <div className="space-y-6">
          <OrientationSection
            title={currentModule.title}
            content={currentModule.content}
            audioUrl={currentModule.audio_url}
            onAudioComplete={handleAudioComplete}
            audioCompleted={currentWatched}
            sectionNumber={currentSection}
          />

          {currentQuizQuestions.length > 0 &&
            (currentQuizPassed ? (
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="pt-6 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <p className="text-sm font-medium">
                    Section {currentSection} quiz passed — score {quizScores[String(currentSection)]}%
                  </p>
                </CardContent>
              </Card>
            ) : (
              <OrientationQuiz
                key={`quiz-${currentSection}`}
                sectionNumber={currentSection}
                questions={currentQuizQuestions}
                passingScore={ORIENTATION_PASSING_SCORE}
                onPass={handleQuizPass}
                onFail={() => {}}
                gradeQuiz={gradeQuiz}
              />
            ))}

          {isLastSection && !canSign && (
            <Card className="border-warning/40 bg-warning/5">
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Acknowledgment locked
                </div>
                <p className="text-sm text-muted-foreground">
                  You can sign the acknowledgment once every section is watched and every quiz is passed with{" "}
                  {ORIENTATION_PASSING_SCORE}% or higher.
                </p>
                {missingSections.length > 0 && (
                  <p className="text-sm">Sections still to complete: {missingSections.join(", ")}</p>
                )}
                {missingQuizzes.length > 0 && (
                  <p className="text-sm">Quizzes still to pass: {missingQuizzes.join(", ")}</p>
                )}
              </CardContent>
            </Card>
          )}

          {!canProceed && !isLastSection && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Lock className="w-4 h-4" />
              {!currentWatched
                ? "Play the section narration to the end, then pass the quiz to continue."
                : `Score ${ORIENTATION_PASSING_SCORE}% or higher on this quiz to continue.`}
            </p>
          )}

          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={handlePrev} disabled={currentSection === 1} className="h-11">
              <ArrowLeft className="w-4 h-4 mr-2" /> Previous
            </Button>
            <Button onClick={handleNext} disabled={isLastSection || !canProceed} className="h-11">
              {!canProceed && !isLastSection && <Lock className="w-4 h-4 mr-2" />}
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
