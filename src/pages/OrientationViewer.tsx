import { useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import OrientationProgressBar from "@/components/orientation/OrientationProgressBar";
import OrientationSection from "@/components/orientation/OrientationSection";
import OrientationQuiz from "@/components/orientation/OrientationQuiz";
import OrientationConfirmation from "@/components/orientation/OrientationConfirmation";
import { useOrientationModules, useOrientationQuizzes, useOrientationProgress } from "@/hooks/useOrientation";

export default function OrientationViewer() {
  const { id: caregiverId } = useParams<{ id: string }>();
  const isPreview = caregiverId === "preview";
  const { modules, loading: modulesLoading } = useOrientationModules();
  const { quizzes, loading: quizzesLoading } = useOrientationQuizzes();
  const { progressList, upsertProgress } = useOrientationProgress();

  const progress = isPreview ? undefined : progressList.find((p) => p.caregiver_id === caregiverId);
  const [currentSection, setCurrentSection] = useState(progress?.current_section || 1);
  const [audioCompleted, setAudioCompleted] = useState<Record<number, boolean>>({});
  const [quizPassed, setQuizPassed] = useState<Record<number, boolean>>({});

  const totalSections = modules.length;
  const sectionsCompleted: number[] = isPreview ? [] : (progress?.sections_completed as number[]) || [];
  const quizScores: Record<string, number> = isPreview ? {} : (progress?.quiz_scores as Record<string, number>) || {};

  // Initialize from saved progress
  useState(() => {
    if (progress && !isPreview) {
      setCurrentSection(progress.current_section);
      const completed: Record<number, boolean> = {};
      const passed: Record<number, boolean> = {};
      sectionsCompleted.forEach((s) => { completed[s] = true; passed[s] = true; });
      setAudioCompleted(completed);
      setQuizPassed(passed);
    }
  });

  const currentModule = modules.find((m) => m.section_number === currentSection);
  const currentQuizQuestions = quizzes.filter((q) => q.section_number === currentSection);
  const isLastSection = currentSection === totalSections;
  const allSectionsComplete = sectionsCompleted.length === totalSections;

  const handleAudioComplete = useCallback(() => {
    setAudioCompleted((prev) => ({ ...prev, [currentSection]: true }));
  }, [currentSection]);

  const handleQuizPass = async (score: number) => {
    setQuizPassed((prev) => ({ ...prev, [currentSection]: true }));
    if (isPreview) return;
    const newCompleted = [...new Set([...sectionsCompleted, currentSection])];
    const newScores = { ...quizScores, [currentSection.toString()]: score };
    if (caregiverId) {
      await upsertProgress(caregiverId, {
        current_section: currentSection,
        sections_completed: newCompleted as any,
        quiz_scores: newScores as any,
        ...(newCompleted.length === totalSections ? { completed_at: new Date().toISOString() } : {}),
      });
    }
  };

  const handleQuizFail = () => {
    // Reset audio so they must re-watch
    setAudioCompleted((prev) => ({ ...prev, [currentSection]: false }));
  };

  const handleNext = () => {
    if (currentSection < totalSections) {
      const next = currentSection + 1;
      setCurrentSection(next);
      if (!isPreview && caregiverId) {
        upsertProgress(caregiverId, { current_section: next });
      }
    }
  };

  const handlePrev = () => {
    if (currentSection > 1) setCurrentSection(currentSection - 1);
  };

  const handleConfirm = async (signatureData: string) => {
    if (!isPreview && caregiverId) {
      await upsertProgress(caregiverId, {
        confirmed_at: new Date().toISOString(),
        signature_data: signatureData,
      });
    }
  };

  const loading = modulesLoading || quizzesLoading;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  const canProceed = isPreview
    ? audioCompleted[currentSection]
    : audioCompleted[currentSection] && (quizPassed[currentSection] || sectionsCompleted.includes(currentSection));

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold">
            {isPreview ? "Orientation Preview" : "New Hire Orientation"}
          </h2>
          <p className="text-muted-foreground">
            {isPreview
              ? "Preview mode — progress is not saved."
              : "Complete all sections, pass each quiz, and confirm to finish."}
          </p>
        </div>

        <OrientationProgressBar
          totalSections={totalSections}
          currentSection={currentSection}
          completedSections={sectionsCompleted}
        />

        {allSectionsComplete && isLastSection ? (
          <OrientationConfirmation
            caregiverName="Caregiver"
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
              audioCompleted={!!audioCompleted[currentSection]}
            />

            {audioCompleted[currentSection] && currentQuizQuestions.length > 0 && !sectionsCompleted.includes(currentSection) && (
              <OrientationQuiz
                sectionNumber={currentSection}
                questions={currentQuizQuestions}
                passingScore={80}
                onPass={handleQuizPass}
                onFail={handleQuizFail}
              />
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={handlePrev} disabled={currentSection === 1}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Previous
              </Button>
              <Button onClick={handleNext} disabled={!canProceed || isLastSection}>
                {!canProceed && <Lock className="w-4 h-4 mr-2" />}
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-12">
            No orientation content found. Please ask your administrator to set up the orientation.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
