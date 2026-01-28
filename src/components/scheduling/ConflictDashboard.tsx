import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  User,
  Calendar,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useWeeklyConflicts, type ConflictItem } from "@/hooks/useWeeklyConflicts";

interface ConflictDashboardProps {
  weekDate: Date;
  onAppointmentClick?: (appointmentId: string) => void;
}

export function ConflictDashboard({ weekDate, onAppointmentClick }: ConflictDashboardProps) {
  const { conflicts, loading, refetch, errorCount, warningCount } = useWeeklyConflicts(weekDate);

  const getConflictIcon = (type: ConflictItem["type"]) => {
    switch (type) {
      case "double_booking":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case "outside_availability":
      case "no_availability":
        return <AlertTriangle className="w-4 h-4 text-warning" />;
    }
  };

  const getConflictBadge = (type: ConflictItem["type"]) => {
    switch (type) {
      case "double_booking":
        return (
          <Badge variant="destructive" className="text-xs">
            Double Booking
          </Badge>
        );
      case "outside_availability":
        return (
          <Badge variant="outline" className="text-xs border-warning text-warning">
            Outside Hours
          </Badge>
        );
      case "no_availability":
        return (
          <Badge variant="outline" className="text-xs border-warning text-warning">
            No Availability
          </Badge>
        );
    }
  };

  // Group conflicts by date
  const conflictsByDate = conflicts.reduce((acc, conflict) => {
    const dateKey = format(conflict.date, "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(conflict);
    return acc;
  }, {} as Record<string, ConflictItem[]>);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Scheduling Conflicts
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refetch}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        {!loading && conflicts.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            {errorCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {errorCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="text-xs border-warning text-warning">
                {warningCount} Warnings
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : conflicts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <h3 className="font-semibold text-lg mb-1">All Clear!</h3>
            <p className="text-sm text-muted-foreground">
              No scheduling conflicts detected for this week
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full max-h-[500px]">
            <div className="p-4 space-y-4">
              {Object.entries(conflictsByDate).map(([dateKey, dateConflicts]) => (
                <div key={dateKey}>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {format(new Date(dateKey), "EEEE, MMM d")}
                    </span>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {dateConflicts.length}
                    </Badge>
                  </div>

                  <div className="space-y-2 ml-6">
                    {dateConflicts.map((conflict) => (
                      <div
                        key={conflict.id}
                        className={`p-3 rounded-lg border ${
                          conflict.severity === "error"
                            ? "border-destructive/50 bg-destructive/5"
                            : "border-warning/50 bg-warning/5"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {getConflictIcon(conflict.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {getConflictBadge(conflict.type)}
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {conflict.startTime} - {conflict.endTime}
                              </span>
                            </div>
                            <p className="text-sm font-medium truncate">{conflict.appointmentTitle}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <User className="w-3 h-3" />
                              <span>{conflict.caregiverName}</span>
                              <span>→</span>
                              <span>{conflict.clientName}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{conflict.message}</p>

                            {conflict.conflictingAppointment && (
                              <div className="mt-2 p-2 rounded bg-background border text-xs">
                                <p className="font-medium">Conflicts with:</p>
                                <p className="text-muted-foreground">
                                  {conflict.conflictingAppointment.title} (
                                  {conflict.conflictingAppointment.startTime}-
                                  {conflict.conflictingAppointment.endTime})
                                </p>
                                <p className="text-muted-foreground">
                                  Client: {conflict.conflictingAppointment.clientName}
                                </p>
                              </div>
                            )}
                          </div>
                          {onAppointmentClick && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0"
                              onClick={() => onAppointmentClick(conflict.appointmentId)}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
