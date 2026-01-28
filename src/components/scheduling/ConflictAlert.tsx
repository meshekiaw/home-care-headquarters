import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CalendarX, UserX } from "lucide-react";
import type { ConflictResult } from "@/hooks/useSchedulingConflicts";

interface ConflictAlertProps {
  conflict: ConflictResult;
}

export function ConflictAlert({ conflict }: ConflictAlertProps) {
  if (!conflict.hasConflict) return null;

  const hasAvailabilityIssue = !!conflict.availabilityConflict;
  const hasBookingIssue = !!conflict.bookingConflict;

  return (
    <div className="space-y-3">
      {hasAvailabilityIssue && conflict.availabilityConflict && (
        <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <Clock className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800 dark:text-orange-400 flex items-center gap-2">
            Availability Conflict
            <Badge variant="outline" className="text-orange-600 border-orange-400">
              {conflict.availabilityConflict.type === "unavailable" ? "No Schedule" : "Outside Hours"}
            </Badge>
          </AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-300">
            {conflict.availabilityConflict.type === "unavailable" ? (
              <p>
                This caregiver has no availability set for <strong>{conflict.availabilityConflict.dayName}</strong>.
                Please check their schedule or choose another time.
              </p>
            ) : (
              <div className="space-y-2">
                <p>
                  The requested time ({conflict.availabilityConflict.requestedStart} - {conflict.availabilityConflict.requestedEnd})
                  is outside the caregiver's available hours on <strong>{conflict.availabilityConflict.dayName}</strong>.
                </p>
                {conflict.availabilityConflict.availableSlots.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Available slots:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {conflict.availabilityConflict.availableSlots.map((slot, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {hasBookingIssue && conflict.bookingConflict && (
        <Alert variant="destructive">
          <CalendarX className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            Double-Booking Conflict
            <Badge variant="destructive">
              {conflict.bookingConflict.appointments.length} Overlap{conflict.bookingConflict.appointments.length > 1 ? "s" : ""}
            </Badge>
          </AlertTitle>
          <AlertDescription>
            <p className="mb-2">This caregiver already has appointments at this time:</p>
            <ul className="space-y-1">
              {conflict.bookingConflict.appointments.map((apt) => (
                <li key={apt.id} className="flex items-center gap-2 text-sm">
                  <UserX className="h-3 w-3" />
                  <span className="font-medium">{apt.clientName}</span>
                  <span className="text-muted-foreground">
                    ({format(apt.startTime, "h:mm a")} - {format(apt.endTime, "h:mm a")})
                  </span>
                  <span>- {apt.title}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
