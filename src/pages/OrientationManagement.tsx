import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, Users, CheckCircle2, Clock, Edit, Trash2,
  Upload, GraduationCap, Volume2, Eye,
} from "lucide-react";
import { useOrientationModules, useOrientationQuizzes, useOrientationProgress } from "@/hooks/useOrientation";
import { orientationSections } from "@/data/orientationContent";
import EditSectionDialog from "@/components/orientation/EditSectionDialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function OrientationManagement() {
  const { modules, loading: modulesLoading, seedModules, updateModule, deleteModule } = useOrientationModules();
  const { quizzes, loading: quizzesLoading, seedQuizzes } = useOrientationQuizzes();
  const { progressList, loading: progressLoading } = useOrientationProgress();
  const { toast } = useToast();

  const [editSection, setEditSection] = useState<{ id: string; title: string; content: string } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  

  const loading = modulesLoading || quizzesLoading || progressLoading;

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

  const completedCount = progressList.filter((p) => p.confirmed_at).length;
  const inProgressCount = progressList.filter((p) => !p.confirmed_at && (p.sections_completed as number[]).length > 0).length;

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
                        <Badge variant="secondary" className="text-xs">
                          <Volume2 className="w-3 h-3 mr-1" /> Browser TTS
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setEditSection({ id: mod.id, title: mod.title, content: mod.content }); setEditOpen(true); }}
                        >
                          <Edit className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteModule(mod.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {progressList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
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
    </DashboardLayout>
  );
}
