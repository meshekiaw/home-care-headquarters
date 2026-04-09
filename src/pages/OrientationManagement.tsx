import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  BookOpen, Users, CheckCircle2, Clock, Edit, Trash2,
  Upload, GraduationCap, Volume2, Eye, Plus, ChevronDown, HelpCircle, ShieldAlert, Download,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrientationModules, useOrientationQuizzes, useOrientationProgress } from "@/hooks/useOrientation";
import { orientationSections } from "@/data/orientationContent";
import EditSectionDialog from "@/components/orientation/EditSectionDialog";
import AddSectionDialog from "@/components/orientation/AddSectionDialog";
import AddQuizQuestionDialog from "@/components/orientation/AddQuizQuestionDialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { downloadOrientationCertificate } from "@/utils/orientationCertificatePdf";

export default function OrientationManagement() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { modules, loading: modulesLoading, seedModules, addModule, updateModule, deleteModule } = useOrientationModules();
  const { quizzes, loading: quizzesLoading, seedQuizzes, addQuiz, updateQuiz, deleteQuiz } = useOrientationQuizzes();
  const { progressList, loading: progressLoading } = useOrientationProgress();
  const { toast } = useToast();

  const [editSection, setEditSection] = useState<{ id: string; title: string; content: string } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Quiz question dialog state
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [quizDialogSection, setQuizDialogSection] = useState(1);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);

  const loading = modulesLoading || quizzesLoading || progressLoading || roleLoading;

  // Show unauthorized state for non-admins
  if (!roleLoading && !isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Orientation management is only available to administrators. If you need to complete your orientation, please use the orientation viewer.
          </p>
          <Button asChild>
            <Link to="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleSeedContent = async () => {
    setSeeding(true);
    try {
      await seedModules(orientationSections.map((s) => ({
        sectionNumber: s.sectionNumber,
        title: s.title,
        content: s.content,
      })));
      const allQuestions = orientationSections.flatMap((s) =>
        s.quizQuestions.map((q) => ({
          sectionNumber: s.sectionNumber,
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points,
        }))
      );
      await seedQuizzes(allQuestions);
    } finally {
      setSeeding(false);
    }
  };

  const handleEditSave = (id: string, title: string, content: string) => {
    updateModule(id, { title, content });
  };

  const handleAddSection = (sectionNumber: number, title: string, content: string) => {
    addModule({ section_number: sectionNumber, title, content });
  };

  const handleAddQuizQuestion = (data: { question_text: string; options: string[]; correct_answer: string; points: number }) => {
    if (editingQuiz) {
      updateQuiz(editingQuiz.id, data);
    } else {
      addQuiz({
        section_number: quizDialogSection,
        question_text: data.question_text,
        options: data.options,
        correct_answer: data.correct_answer,
        points: data.points,
        sort_order: quizzes.filter((q) => q.section_number === quizDialogSection).length,
      });
    }
  };

  const completedCount = progressList.filter((p) => p.confirmed_at).length;
  const inProgressCount = progressList.filter((p) => !p.confirmed_at && (p.sections_completed as number[]).length > 0).length;
  const nextSectionNumber = modules.length > 0 ? Math.max(...modules.map((m) => m.section_number)) + 1 : 1;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Orientation Management</h2>
            <p className="text-muted-foreground">Manage orientation content, quizzes, and track completions</p>
          </div>
          <div className="flex gap-2">
            {modules.length === 0 && (
              <Button onClick={handleSeedContent} loading={seeding}>
                <Upload className="w-4 h-4 mr-2" />
                Load Orientation Content
              </Button>
            )}
            {modules.length > 0 && (
              <Button asChild>
                <Link to="/lms/orientation/preview">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Orientation
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{modules.length}</p>
                  <p className="text-sm text-muted-foreground">Sections</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <GraduationCap className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{quizzes.length}</p>
                  <p className="text-sm text-muted-foreground">Quiz Questions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedCount}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <Clock className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{inProgressCount}</p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sections">
          <TabsList>
            <TabsTrigger value="sections">Sections ({modules.length})</TabsTrigger>
            <TabsTrigger value="progress">Completion Dashboard</TabsTrigger>
          </TabsList>

          <TabsContent value="sections" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setAddSectionOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </div>

            {modules.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No orientation content yet. Click "Load Orientation Content" to get started.</p>
                </CardContent>
              </Card>
            ) : (
              modules.map((mod) => {
                const sectionQuizzes = quizzes.filter((q) => q.section_number === mod.section_number);
                return (
                  <Card key={mod.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">
                            Section {mod.section_number}: {mod.title}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {sectionQuizzes.length} quiz questions
                            {mod.audio_url && " • Audio ready"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            <Volume2 className="w-3 h-3 mr-1" /> Browser TTS
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setEditSection({ id: mod.id, title: mod.title, content: mod.content }); setEditOpen(true); }}
                        >
                          <Edit className="w-3 h-3 mr-1" /> Edit Section
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteModule(mod.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Quiz questions collapsible */}
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full justify-between">
                            <span className="flex items-center gap-1">
                              <HelpCircle className="w-3 h-3" />
                              Quiz Questions ({sectionQuizzes.length})
                            </span>
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 pt-2">
                          {sectionQuizzes.map((q, qi) => (
                            <div key={q.id} className="flex items-start justify-between border rounded-md p-3 bg-muted/30">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{qi + 1}. {q.question_text}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {(q.options as string[]).join(" • ")} — Answer: {q.correct_answer} ({q.points} pts)
                                </p>
                              </div>
                              <div className="flex gap-1 ml-2 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setQuizDialogSection(mod.section_number);
                                    setEditingQuiz(q);
                                    setQuizDialogOpen(true);
                                  }}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => deleteQuiz(q.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setQuizDialogSection(mod.section_number);
                              setEditingQuiz(null);
                              setQuizDialogOpen(true);
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add Question
                          </Button>
                        </CollapsibleContent>
                      </Collapsible>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <Card>
              <Table>
                <TableHeader>
                   <TableRow>
                    <TableHead>Caregiver</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confirmed</TableHead>
                    <TableHead>Certificate</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {progressList.length === 0 ? (
                    <TableRow>
                       <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        No orientation progress yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    progressList.map((p) => {
                      const completed = (p.sections_completed as number[]).length;
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            <Link to={`/lms/orientation/${p.caregiver_id}`} className="text-primary hover:underline">
                              {p.caregiver ? `${p.caregiver.first_name} ${p.caregiver.last_name}` : "Unknown"}
                            </Link>
                          </TableCell>
                          <TableCell>{completed}/{modules.length} sections</TableCell>
                          <TableCell>
                            {p.confirmed_at ? (
                              <Badge className="bg-success/10 text-success border-success/20">Completed</Badge>
                            ) : completed > 0 ? (
                              <Badge className="bg-warning/10 text-warning border-warning/20">In Progress</Badge>
                            ) : (
                              <Badge variant="secondary">Not Started</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {p.confirmed_at ? format(new Date(p.confirmed_at), "MMM d, yyyy") : "—"}
                          </TableCell>
                          <TableCell>
                            {p.confirmed_at && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const name = p.caregiver
                                    ? `${p.caregiver.first_name} ${p.caregiver.last_name}`
                                    : "Unknown";
                                  downloadOrientationCertificate({
                                    caregiverName: name,
                                    completionDate: format(new Date(p.confirmed_at!), "MMMM d, yyyy"),
                                    totalSections: modules.length,
                                    signatureData: p.signature_data,
                                  });
                                }}
                              >
                                <Download className="w-4 h-4 mr-1" /> PDF
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <EditSectionDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        section={editSection}
        onSave={handleEditSave}
      />

      <AddSectionDialog
        open={addSectionOpen}
        onOpenChange={setAddSectionOpen}
        onSave={handleAddSection}
        nextSectionNumber={nextSectionNumber}
      />

      <AddQuizQuestionDialog
        open={quizDialogOpen}
        onOpenChange={setQuizDialogOpen}
        sectionNumber={quizDialogSection}
        onSave={handleAddQuizQuestion}
        editQuestion={editingQuiz}
      />
    </DashboardLayout>
  );
}
