import { useState, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Trash2, GripHorizontal } from "lucide-react";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

interface AvailabilityCalendarProps {
  availability: Tables<"caregiver_availability">[];
  onSetSlot: (slot: Omit<TablesInsert<"caregiver_availability">, "user_id" | "caregiver_id">) => Promise<any>;
  onDeleteSlot: (id: string) => Promise<boolean>;
}

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM
const HOUR_HEIGHT = 32; // pixels per hour

function formatTime(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}${period}`;
}

function parseTimeToHour(time: string): number {
  const [hours] = time.split(":").map(Number);
  return hours;
}

function hourToTimeString(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

type ResizeEdge = "top" | "bottom" | null;

export default function AvailabilityCalendar({
  availability,
  onSetSlot,
  onDeleteSlot,
}: AvailabilityCalendarProps) {
  // Create new slot state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: number; hour: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ day: number; hour: number } | null>(null);
  
  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeSlot, setResizeSlot] = useState<Tables<"caregiver_availability"> | null>(null);
  const [resizeEdge, setResizeEdge] = useState<ResizeEdge>(null);
  const [resizeHour, setResizeHour] = useState<number | null>(null);
  
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Group availability by day
  const availabilityByDay = useMemo(() => {
    const grouped: Record<number, Tables<"caregiver_availability">[]> = {};
    DAYS.forEach((day) => {
      grouped[day.value] = availability
        .filter((a) => a.day_of_week === day.value)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
    });
    return grouped;
  }, [availability]);

  // Create new slot handlers
  const handleMouseDown = useCallback((day: number, hour: number, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-slot-id]")) return;
    if (isResizing) return;
    
    setIsDragging(true);
    setDragStart({ day, hour });
    setDragEnd({ day, hour });
  }, [isResizing]);

  const handleMouseMove = useCallback((day: number, hour: number) => {
    if (isResizing && resizeSlot && resizeEdge) {
      setResizeHour(hour);
      return;
    }
    
    if (!isDragging || !dragStart) return;
    if (day === dragStart.day) {
      setDragEnd({ day, hour });
    }
  }, [isDragging, dragStart, isResizing, resizeSlot, resizeEdge]);

  const handleMouseUp = useCallback(async () => {
    // Handle resize completion
    if (isResizing && resizeSlot && resizeEdge && resizeHour !== null) {
      const originalStart = parseTimeToHour(resizeSlot.start_time);
      const originalEnd = parseTimeToHour(resizeSlot.end_time);
      
      let newStart = originalStart;
      let newEnd = originalEnd;
      
      if (resizeEdge === "top") {
        newStart = Math.min(resizeHour, originalEnd - 1);
        newStart = Math.max(6, newStart); // Clamp to 6 AM
      } else {
        newEnd = Math.max(resizeHour + 1, originalStart + 1);
        newEnd = Math.min(23, newEnd); // Clamp to 11 PM
      }
      
      if (newStart !== originalStart || newEnd !== originalEnd) {
        // Delete old slot and create new one
        await onDeleteSlot(resizeSlot.id);
        await onSetSlot({
          day_of_week: resizeSlot.day_of_week,
          start_time: hourToTimeString(newStart),
          end_time: hourToTimeString(newEnd),
          is_available: resizeSlot.is_available,
          notes: resizeSlot.notes,
        });
      }
      
      setIsResizing(false);
      setResizeSlot(null);
      setResizeEdge(null);
      setResizeHour(null);
      return;
    }
    
    // Handle create new slot
    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const startHour = Math.min(dragStart.hour, dragEnd.hour);
    const endHour = Math.max(dragStart.hour, dragEnd.hour) + 1;

    if (endHour > startHour) {
      await onSetSlot({
        day_of_week: dragStart.day,
        start_time: hourToTimeString(startHour),
        end_time: hourToTimeString(endHour),
        is_available: true,
        notes: null,
      });
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, isResizing, resizeSlot, resizeEdge, resizeHour, onSetSlot, onDeleteSlot]);

  // Resize handlers
  const handleResizeStart = useCallback((slot: Tables<"caregiver_availability">, edge: ResizeEdge, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeSlot(slot);
    setResizeEdge(edge);
    const startHour = parseTimeToHour(slot.start_time);
    const endHour = parseTimeToHour(slot.end_time);
    setResizeHour(edge === "top" ? startHour : endHour - 1);
  }, []);

  const getSlotStyle = (slot: Tables<"caregiver_availability">) => {
    const startHour = parseTimeToHour(slot.start_time);
    const endHour = parseTimeToHour(slot.end_time);
    
    // Apply resize preview if this slot is being resized
    let displayStart = startHour;
    let displayEnd = endHour;
    
    if (isResizing && resizeSlot?.id === slot.id && resizeHour !== null) {
      if (resizeEdge === "top") {
        displayStart = Math.min(resizeHour, endHour - 1);
        displayStart = Math.max(6, displayStart);
      } else {
        displayEnd = Math.max(resizeHour + 1, startHour + 1);
        displayEnd = Math.min(23, displayEnd);
      }
    }
    
    const top = (displayStart - 6) * HOUR_HEIGHT;
    const height = (displayEnd - displayStart) * HOUR_HEIGHT;
    return { top: `${top}px`, height: `${Math.max(height, 24)}px` };
  };

  const getDragPreviewStyle = () => {
    if (!dragStart || !dragEnd) return null;
    const startHour = Math.min(dragStart.hour, dragEnd.hour);
    const endHour = Math.max(dragStart.hour, dragEnd.hour) + 1;
    const top = (startHour - 6) * HOUR_HEIGHT;
    const height = (endHour - startHour) * HOUR_HEIGHT;
    return { top: `${top}px`, height: `${height}px` };
  };

  return (
    <div 
      className={cn(
        "border rounded-lg overflow-hidden select-none",
        isResizing && "cursor-ns-resize"
      )}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (isDragging) {
          setIsDragging(false);
          setDragStart(null);
          setDragEnd(null);
        }
        if (isResizing) {
          setIsResizing(false);
          setResizeSlot(null);
          setResizeEdge(null);
          setResizeHour(null);
        }
      }}
    >
      {/* Header */}
      <div className="flex bg-muted/50 border-b">
        <div className="w-14 shrink-0 border-r p-2" />
        {DAYS.map((day) => (
          <div
            key={day.value}
            className="flex-1 text-center py-2 border-r last:border-r-0 font-medium text-sm"
          >
            {day.label}
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <div className="flex" ref={gridRef}>
        {/* Time Column */}
        <div className="w-14 shrink-0 border-r bg-muted/30">
          {HOURS.map((hour) => (
            <div key={hour} className="h-8 border-b px-1 flex items-start justify-end">
              <span className="text-[10px] text-muted-foreground -mt-1">
                {formatTime(hour)}
              </span>
            </div>
          ))}
        </div>

        {/* Days */}
        {DAYS.map((day) => (
          <div key={day.value} className="flex-1 border-r last:border-r-0 relative">
            {/* Hour slots (for interaction) */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className={cn(
                  "h-8 border-b cursor-crosshair transition-colors",
                  isDragging && dragStart?.day === day.value && 
                  hour >= Math.min(dragStart.hour, dragEnd?.hour || dragStart.hour) &&
                  hour <= Math.max(dragStart.hour, dragEnd?.hour || dragStart.hour)
                    ? "bg-primary/20"
                    : "hover:bg-muted/50"
                )}
                onMouseDown={(e) => handleMouseDown(day.value, hour, e)}
                onMouseMove={() => handleMouseMove(day.value, hour)}
              />
            ))}

            {/* Drag Preview */}
            {isDragging && dragStart?.day === day.value && dragEnd && (
              <div
                className="absolute left-1 right-1 bg-primary/30 border-2 border-dashed border-primary rounded pointer-events-none z-10"
                style={getDragPreviewStyle() || undefined}
              />
            )}

            {/* Existing Availability Slots */}
            {availabilityByDay[day.value]?.map((slot) => (
              <div
                key={slot.id}
                data-slot-id={slot.id}
                className={cn(
                  "absolute left-1 right-1 rounded px-1.5 cursor-pointer transition-all text-xs overflow-hidden group",
                  slot.is_available
                    ? "bg-success/20 border border-success text-success-foreground hover:bg-success/30"
                    : "bg-muted border border-border text-muted-foreground hover:bg-muted/80",
                  isResizing && resizeSlot?.id === slot.id && "ring-2 ring-primary"
                )}
                style={getSlotStyle(slot)}
                onMouseEnter={() => setHoveredSlot(slot.id)}
                onMouseLeave={() => setHoveredSlot(null)}
              >
                {/* Top resize handle */}
                <div
                  className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-primary/20 to-transparent"
                  onMouseDown={(e) => handleResizeStart(slot, "top", e)}
                >
                  <GripHorizontal className="w-3 h-3 text-primary" />
                </div>
                
                <div className="flex items-center justify-between h-full py-2">
                  <span className="truncate font-medium">
                    {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                  </span>
                  {hoveredSlot === slot.id && !isResizing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSlot(slot.id);
                      }}
                      className="shrink-0 p-0.5 hover:bg-destructive/20 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </button>
                  )}
                </div>
                {slot.notes && (
                  <div className="truncate text-[10px] opacity-70">{slot.notes}</div>
                )}
                
                {/* Bottom resize handle */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-primary/20 to-transparent"
                  onMouseDown={(e) => handleResizeStart(slot, "bottom", e)}
                >
                  <GripHorizontal className="w-3 h-3 text-primary" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 p-2 bg-muted/30 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-success/20 border border-success" />
          <span>Available</span>
        </div>
        <span className="text-muted-foreground/60">•</span>
        <span>Drag to add • Drag edges to resize</span>
      </div>
    </div>
  );
}

