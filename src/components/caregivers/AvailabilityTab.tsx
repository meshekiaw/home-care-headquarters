import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Clock, Trash2, Calendar, List } from "lucide-react";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import AvailabilityCalendar from "./AvailabilityCalendar";

interface AvailabilityTabProps {
  availability: Tables<"caregiver_availability">[];
  onSetSlot: (slot: Omit<TablesInsert<"caregiver_availability">, "user_id" | "caregiver_id">) => Promise<any>;
  onDeleteSlot: (id: string) => Promise<boolean>;
}

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const TIME_SLOTS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00",
];

export default function AvailabilityTab({ availability, onSetSlot, onDeleteSlot }: AvailabilityTabProps) {
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    day_of_week: 1,
    start_time: "09:00",
    end_time: "17:00",
    is_available: true,
    notes: "",
  });

  const handleAdd = async () => {
    await onSetSlot({
      day_of_week: formData.day_of_week,
      start_time: formData.start_time,
      end_time: formData.end_time,
      is_available: formData.is_available,
      notes: formData.notes || null,
    });
    setAddDialogOpen(false);
    setFormData({
      day_of_week: 1,
      start_time: "09:00",
      end_time: "17:00",
      is_available: true,
      notes: "",
    });
  };

  // Group availability by day for list view
  const availabilityByDay = DAYS.map((day) => ({
    ...day,
    slots: availability.filter((a) => a.day_of_week === day.value).sort((a, b) => a.start_time.localeCompare(b.start_time)),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "list")} className="w-auto">
          <TabsList className="h-8">
            <TabsTrigger value="calendar" className="text-xs px-2.5 gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="list" className="text-xs px-2.5 gap-1.5">
              <List className="w-3.5 h-3.5" />
              List
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Time Slot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Availability Slot</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select
                  value={formData.day_of_week.toString()}
                  onValueChange={(v) => setFormData((f) => ({ ...f, day_of_week: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Select
                    value={formData.start_time}
                    onValueChange={(v) => setFormData((f) => ({ ...f, start_time: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Select
                    value={formData.end_time}
                    onValueChange={(v) => setFormData((f) => ({ ...f, end_time: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g., Prefer morning shifts"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd}>
                Add Slot
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {viewMode === "calendar" ? (
        <AvailabilityCalendar
          availability={availability}
          onSetSlot={onSetSlot}
          onDeleteSlot={onDeleteSlot}
        />
      ) : (
        <div className="space-y-3">
          {availabilityByDay.map((day) => (
            <Card key={day.value}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-24 flex-shrink-0">
                    <span className="font-medium text-sm">{day.label}</span>
                  </div>
                  <div className="flex-1">
                    {day.slots.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {day.slots.map((slot) => (
                          <Badge
                            key={slot.id}
                            variant={slot.is_available ? "default" : "secondary"}
                            className="text-sm py-1.5 px-3 gap-2 group"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                            <button
                              onClick={() => onDeleteSlot(slot.id)}
                              className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No availability set</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {availability.length === 0 && (
        <Card className="mt-4">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No availability set</h3>
            <p className="text-sm text-muted-foreground">
              {viewMode === "calendar" 
                ? "Click and drag on the calendar to add availability, or use the Add Time Slot button"
                : "Add time slots to define when this caregiver is available"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
