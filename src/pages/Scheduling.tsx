import { useState } from "react";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Plus, AlertTriangle, PanelRightClose, PanelRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeekView } from "@/components/scheduling/WeekView";
import { MonthView } from "@/components/scheduling/MonthView";
import { DayView } from "@/components/scheduling/DayView";
import { AppointmentDialog } from "@/components/scheduling/AppointmentDialog";
import { ConflictDashboard } from "@/components/scheduling/ConflictDashboard";
import { useAppointments, type Appointment } from "@/hooks/useAppointments";
import { Skeleton } from "@/components/ui/skeleton";
import { useWeeklyConflicts } from "@/hooks/useWeeklyConflicts";
import { downloadCSV, formatAppointmentForExport } from "@/utils/csvExport";
import { useToast } from "@/hooks/use-toast";

type ViewType = "day" | "week" | "month";

export default function Scheduling() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>("week");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number | undefined>();
  const [editingAppointment, setEditingAppointment] = useState<Appointment | undefined>();
  const [showConflicts, setShowConflicts] = useState(true);

  const {
    appointments,
    loading,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments(selectedDate);

  const { errorCount, warningCount } = useWeeklyConflicts(selectedDate);
  const { toast } = useToast();

  const handleExportAppointments = () => {
    const exportData = appointments.map(apt => 
      formatAppointmentForExport(
        apt,
        apt.client ? `${apt.client.first_name} ${apt.client.last_name}` : 'Unknown',
        apt.caregiver ? `${apt.caregiver.first_name} ${apt.caregiver.last_name}` : 'Unknown'
      )
    );
    downloadCSV(exportData, `appointments-${format(selectedDate, 'yyyy-MM')}`);
    toast({ title: "Export complete", description: `Exported ${appointments.length} appointments` });
  };

  const navigatePrevious = () => {
    switch (viewType) {
      case "day":
        setSelectedDate(subDays(selectedDate, 1));
        break;
      case "week":
        setSelectedDate(subWeeks(selectedDate, 1));
        break;
      case "month":
        setSelectedDate(subMonths(selectedDate, 1));
        break;
    }
  };

  const navigateNext = () => {
    switch (viewType) {
      case "day":
        setSelectedDate(addDays(selectedDate, 1));
        break;
      case "week":
        setSelectedDate(addWeeks(selectedDate, 1));
        break;
      case "month":
        setSelectedDate(addMonths(selectedDate, 1));
        break;
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    setEditingAppointment(undefined);
    setDialogOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setViewType("day");
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedDate(new Date(appointment.start_time));
    setEditingAppointment(appointment);
    setDialogOpen(true);
  };

  const handleNewAppointment = () => {
    setSelectedHour(9);
    setEditingAppointment(undefined);
    setDialogOpen(true);
  };

  const getHeaderTitle = () => {
    switch (viewType) {
      case "day":
        return format(selectedDate, "MMMM d, yyyy");
      case "week":
        return format(selectedDate, "MMMM yyyy");
      case "month":
        return format(selectedDate, "MMMM yyyy");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Scheduling</h2>
            <p className="text-muted-foreground">Manage caregiver schedules and client visits</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportAppointments}
              disabled={appointments.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant={showConflicts ? "secondary" : "outline"}
              onClick={() => setShowConflicts(!showConflicts)}
              className="relative"
            >
              {showConflicts ? (
                <PanelRightClose className="w-4 h-4 mr-2" />
              ) : (
                <PanelRight className="w-4 h-4 mr-2" />
              )}
              Conflicts
              {(errorCount > 0 || warningCount > 0) && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center">
                  {errorCount > 0 ? (
                    <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                      {errorCount}
                    </span>
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-warning text-warning-foreground text-xs flex items-center justify-center">
                      {warningCount}
                    </span>
                  )}
                </span>
              )}
            </Button>
            <Button onClick={handleNewAppointment}>
              <Plus className="w-4 h-4 mr-2" />
              New Appointment
            </Button>
          </div>
        </div>

        <div className={`flex-1 flex gap-6 overflow-hidden ${showConflicts ? "" : ""}`}>
          {/* Main Calendar */}
          <Card className={`flex-1 flex flex-col overflow-hidden ${showConflicts ? "lg:flex-[2]" : ""}`}>
            <CardContent className="p-4 flex flex-col flex-1 overflow-hidden">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={navigatePrevious}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={navigateNext}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <h3 className="text-lg font-semibold ml-2">{getHeaderTitle()}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
                <div className="flex rounded-lg border overflow-hidden">
                  <Button
                    variant={viewType === "day" ? "secondary" : "ghost"}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setViewType("day")}
                  >
                    Day
                  </Button>
                  <Button
                    variant={viewType === "week" ? "secondary" : "ghost"}
                    size="sm"
                    className="rounded-none border-x"
                    onClick={() => setViewType("week")}
                  >
                    Week
                  </Button>
                  <Button
                    variant={viewType === "month" ? "secondary" : "ghost"}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setViewType("month")}
                  >
                    Month
                  </Button>
                </div>
              </div>
            </div>

            {/* Calendar View */}
            <div className="flex-1 overflow-hidden">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-[400px] w-full" />
                </div>
              ) : (
                <>
                  {viewType === "day" && (
                    <DayView
                      selectedDate={selectedDate}
                      appointments={appointments}
                      onTimeSlotClick={handleTimeSlotClick}
                      onAppointmentClick={handleAppointmentClick}
                    />
                  )}
                  {viewType === "week" && (
                    <WeekView
                      selectedDate={selectedDate}
                      appointments={appointments}
                      onTimeSlotClick={handleTimeSlotClick}
                      onAppointmentClick={handleAppointmentClick}
                    />
                  )}
                  {viewType === "month" && (
                    <MonthView
                      selectedDate={selectedDate}
                      appointments={appointments}
                      onDayClick={handleDayClick}
                      onAppointmentClick={handleAppointmentClick}
                    />
                  )}
                </>
              )}
            </div>
            </CardContent>
          </Card>

          {/* Conflict Dashboard */}
          {showConflicts && (
            <div className="hidden lg:block lg:flex-1 lg:max-w-md">
              <ConflictDashboard weekDate={selectedDate} />
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary" />
            <span>Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-success" />
            <span>Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-warning" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-muted-foreground" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-destructive" />
            <span>Cancelled</span>
          </div>
        </div>
      </div>

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedDate={selectedDate}
        selectedHour={selectedHour}
        appointment={editingAppointment}
        onSave={createAppointment}
        onUpdate={updateAppointment}
        onDelete={deleteAppointment}
      />
    </DashboardLayout>
  );
}
