import { useEffect, useState } from "react";
import CaregiverLayout from "@/components/layout/CaregiverLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import OrientationViewer from "@/pages/OrientationViewer";
import { Skeleton } from "@/components/ui/skeleton";

export default function CaregiverOrientation() {
  const { user } = useAuth();
  const [caregiverId, setCaregiverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("caregivers")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setCaregiverId(data?.id || null);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <CaregiverLayout>
        <Skeleton className="h-96" />
      </CaregiverLayout>
    );
  }

  if (!caregiverId) {
    return (
      <CaregiverLayout>
        <p className="text-muted-foreground text-center py-12">
          Your caregiver profile could not be found. Please contact your administrator.
        </p>
      </CaregiverLayout>
    );
  }

  // Render the orientation viewer embedded in caregiver layout
  // We'll pass the caregiverId as a URL param equivalent
  return <OrientationViewerWrapper caregiverId={caregiverId} />;
}

function OrientationViewerWrapper({ caregiverId }: { caregiverId: string }) {
  // We need to render the orientation viewer with the caregiver's ID
  // Since OrientationViewer uses useParams, we redirect to the proper URL
  useEffect(() => {
    // Navigate to the orientation viewer with the caregiver ID
    window.history.replaceState(null, "", `/my-orientation`);
  }, []);

  return <OrientationViewerInner caregiverId={caregiverId} />;
}

// Inline version of orientation viewer for caregiver layout
import { useState as useStateFn, useCallback } from "react";
import CaregiverLayoutInner from "@/components/layout/CaregiverLayout";
import OrientationProgressBar from "@/components/orientation/OrientationProgressBar";
import OrientationSection from "@/components/orientation/OrientationSection";
import OrientationQuiz from "@/components/orientation/OrientationQuiz";
import OrientationConfirmation from "@/components/orientation/OrientationConfirmation";
import { useOrientationModules, useOrientationQuizzes, useOrientationProgress } from "@/hooks/useOrientation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";

function OrientationViewerInner({ caregiverId }: { caregiverId: string }) {
  const { modules, loading: modulesLoading } = useOrientationModules();
  const { quizzes, loading: quizzesLoading, gradeQuiz } = useOrientationQuizzes();
  const { progressList, upsertProgress } = useOrientationProgress();

  const progress = progressList.find((p) => p.caregiver_id === caregiverId);
  const [currentSection, setCurrentSection] = useStateFn(progress?.current_section || 1);
  const [audioCompleted, setAudioCompleted] = useStateFn<Record<number, boolean>>({});
  const [quizPassed, setQuizPassed] = useStateFn<Record<number, boolean>>({});

  const totalSections = modules.length;
  const sectionsCompleted: number[] = (progress?.sections_completed as number[]) || [];
  const quizScores: Record<string, number> = (progress?.quiz_scores as Record<string, number>) || {};

  useStateFn(() => {
    if (progress) {
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
    const newCompleted = [...new Set([...sectionsCompleted, currentSection])];
    const newScores = { ...quizScores, [currentSection.toString()]: score };
    await upsertProgress(caregiverId, {
      current_section: currentSection,
      sections_completed: newCompleted as any,
      quiz_scores: newScores as any,
      ...(newCompleted.length === totalSections ? { completed_at: new Date().toISOString() } : {}),
    });
  };

  const handleQuizFail = () => {
    setAudioCompleted((prev) => ({ ...prev, [currentSection]: false }));
  };

  const handleNext = () => {
    if (currentSection < totalSections) {
      const next = currentSection + 1;
      setCurrentSection(next);
      upsertProgress(caregiverId, { current_section: next });
    }
  };

  const handlePrev = () => {
    if (currentSection > 1) setCurrentSection(currentSection - 1);
  };

  const handleConfirm = async (signatureData: string) => {
    await upsertProgress(caregiverId, {
      confirmed_at: new Date().toISOString(),
      signature_data: signatureData,
    });
  };

  if (modulesLoading || quizzesLoading) {
    return (
      <CaregiverLayoutInner>
        <Skeleton className="h-96" />
      </CaregiverLayoutInner>
    );
  }

  const canProceed = audioCompleted[currentSection] && (quizPassed[currentSection] || sectionsCompleted.includes(currentSection));

  // Get caregiver name for certificate
  const caregiverData = progressList.find(p => p.caregiver_id === caregiverId);

  return (
    <CaregiverLayoutInner>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold">New Hire Orientation</h2>
          <p className="text-muted-foreground">
            Complete all sections, pass each quiz, and confirm to finish.
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
              sectionNumber={currentSection}
            />

            {audioCompleted[currentSection] && currentQuizQuestions.length > 0 && !sectionsCompleted.includes(currentSection) && (
              <OrientationQuiz
                sectionNumber={currentSection}
                questions={currentQuizQuestions}
                passingScore={80}
                onPass={handleQuizPass}
                onFail={handleQuizFail}
                gradeQuiz={gradeQuiz}
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
    </CaregiverLayoutInner>
  );
}
