import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, GraduationCap, AlertTriangle, CheckCircle2, Clock,
  Search, Plus, Users, TrendingUp, BarChart3, FileText, Download, Send,
} from "lucide-react";
import { useLmsCourses, useLmsAssignments } from "@/hooks/useLmsCourses";
import { format, isPast, differenceInDays } from "date-fns";
import AddCourseDialog from "@/components/lms/AddCourseDialog";
import AssignCourseDialog from "@/components/lms/AssignCourseDialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function LmsTraining() {
  const navigate = useNavigate();
  const { courses, loading: coursesLoading } = useLmsCourses();
  const { assignments, loading: assignmentsLoading, refetch } = useLmsAssignments();
  const [searchQuery, setSearchQuery] = useState("");
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const { toast } = useToast();

  const loading = coursesLoading || assignmentsLoading;

  const resendNotification = async (assignmentId: string) => {
    try {
      const { error } = await supabase.functions.invoke("send-lms-assignment-notification", {
        body: { assignment_ids: [assignmentId] },
      });
      if (error) throw error;
      toast({ title: "Notification re-sent" });
      refetch();
    } catch (e: any) {
      toast({ title: "Failed to send notification", description: e.message, variant: "destructive" });
    }
  };

  const downloadCertificate = async (path: string | null) => {
    if (!path) return;
    const { data, error } = await supabase.storage.from("lms-certificates").createSignedUrl(path, 60);
    if (error || !data) {
      toast({ title: "Could not load certificate", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  // Stats
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter((a) => a.status === "completed").length;
  const overdueAssignments = assignments.filter(
    (a) => a.status !== "completed" && a.due_date && isPast(new Date(a.due_date))
  ).length;
  const inProgressAssignments = assignments.filter((a) => a.status === "in_progress").length;
  const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

  const filteredAssignments = assignments.filter((a) => {
    const query = searchQuery.toLowerCase();
    const caregiverName = a.caregiver ? `${a.caregiver.first_name} ${a.caregiver.last_name}` : "";
    const courseTitle = a.course?.title || "";
    return caregiverName.toLowerCase().includes(query) || courseTitle.toLowerCase().includes(query);
  });

  const overdueList = assignments.filter(
    (a) => a.status !== "completed" && a.due_date && isPast(new Date(a.due_date))
  );

  const getStatusBadge = (assignment: typeof assignments[0]) => {
    if (assignment.status === "completed") {
      return <Badge className="bg-success/10 text-success border-success/20">Completed</Badge>;
    }
    if (assignment.due_date && isPast(new Date(assignment.due_date))) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    if (assignment.status === "in_progress") {
      return <Badge className="bg-warning/10 text-warning border-warning/20">In Progress</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const getDaysInfo = (dueDate: string | null) => {
    if (!dueDate) return null;
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) return <span className="text-destructive font-medium">{Math.abs(days)}d overdue</span>;
    if (days <= 7) return <span className="text-warning font-medium">{days}d left</span>;
    return <span className="text-muted-foreground">{days}d left</span>;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Training Management</h2>
            <p className="text-muted-foreground">Manage courses, assignments, and compliance tracking</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAssignDialogOpen(true)}>
              <Users className="w-4 h-4 mr-2" />
              Assign Course
            </Button>
            <Button onClick={() => setAddCourseOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Course
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{courses.length}</p>
                  <p className="text-sm text-muted-foreground">Total Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completionRate}%</p>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-destructive/10">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overdueAssignments}</p>
                  <p className="text-sm text-muted-foreground">Overdue</p>
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
                  <p className="text-2xl font-bold">{inProgressAssignments}</p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Alert */}
        {overdueAssignments > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <h3 className="font-semibold text-destructive">Attention Required</h3>
                  <p className="text-sm text-muted-foreground">
                    {overdueAssignments} training assignment(s) are overdue. Review and take corrective action.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orientation Card */}
        <Card className="border-primary/20 bg-primary/5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/lms/orientation")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">New Hire Orientation</h3>
                <p className="text-sm text-muted-foreground">Interactive orientation with voiceover, quizzes, and completion tracking</p>
              </div>
              <Button variant="outline" size="sm">Manage →</Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="assignments">
          <TabsList>
            <TabsTrigger value="assignments">All Assignments</TabsTrigger>
            <TabsTrigger value="overdue">
              Overdue {overdueAssignments > 0 && `(${overdueAssignments})`}
            </TabsTrigger>
            <TabsTrigger value="courses">Courses ({courses.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by caregiver or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caregiver</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Time Left</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No assignments found. Assign a course to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          {a.caregiver ? `${a.caregiver.first_name} ${a.caregiver.last_name}` : "Unknown"}
                        </TableCell>
                        <TableCell>{a.course?.title || "Unknown"}</TableCell>
                        <TableCell>{a.due_date ? format(new Date(a.due_date), "MMM d, yyyy") : "—"}</TableCell>
                        <TableCell>{getStatusBadge(a)}</TableCell>
                        <TableCell>{a.score !== null ? `${a.score}%` : "—"}</TableCell>
                        <TableCell>{getDaysInfo(a.due_date)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="overdue" className="space-y-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caregiver</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-success" />
                        All training assignments are up to date!
                      </TableCell>
                    </TableRow>
                  ) : (
                    overdueList.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          {a.caregiver ? `${a.caregiver.first_name} ${a.caregiver.last_name}` : "Unknown"}
                        </TableCell>
                        <TableCell>{a.course?.title || "Unknown"}</TableCell>
                        <TableCell>{a.due_date ? format(new Date(a.due_date), "MMM d, yyyy") : "—"}</TableCell>
                        <TableCell>
                          <span className="text-destructive font-medium">
                            {a.due_date ? `${Math.abs(differenceInDays(new Date(a.due_date), new Date()))} days` : "—"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => {
                const courseAssignments = assignments.filter((a) => a.course_id === course.id);
                const completed = courseAssignments.filter((a) => a.status === "completed").length;
                return (
                  <Card key={course.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{course.title}</CardTitle>
                        <div className="flex gap-1">
                          {course.is_required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                          <Badge variant="secondary" className="text-xs capitalize">{course.content_type}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{course.description || "No description"}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {course.duration_minutes ? `${course.duration_minutes} min` : "—"} • Pass: {course.passing_score}%
                        </span>
                        <span className="font-medium">{completed}/{courseAssignments.length} done</span>
                      </div>
                      {courseAssignments.length > 0 && (
                        <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-success rounded-full transition-all"
                            style={{ width: `${(completed / courseAssignments.length) * 100}%` }}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {courses.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No courses yet. Create your first course to get started.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AddCourseDialog open={addCourseOpen} onOpenChange={setAddCourseOpen} />
      <AssignCourseDialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen} />
    </DashboardLayout>
  );
}
