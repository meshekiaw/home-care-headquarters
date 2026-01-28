import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Scheduling() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Scheduling</h2>
            <p className="text-muted-foreground">Manage caregiver schedules and client visits</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <h3 className="text-lg font-semibold ml-2">{currentMonth}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">Today</Button>
                <Button variant="outline" size="sm">Week</Button>
                <Button variant="secondary" size="sm">Month</Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              {Array.from({ length: 35 }, (_, i) => (
                <div 
                  key={i} 
                  className="aspect-square p-2 border border-border rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <span className="text-sm text-muted-foreground">{((i % 31) + 1)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Today's Schedule</h3>
              </div>
              <div className="space-y-3">
                {[
                  { time: "9:00 AM", client: "Eleanor Thompson", caregiver: "Maria Santos" },
                  { time: "11:00 AM", client: "Robert Chen", caregiver: "David Wilson" },
                  { time: "2:00 PM", client: "Patricia Davis", caregiver: "Sarah Johnson" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.client}</p>
                      <p className="text-sm text-muted-foreground">{item.caregiver}</p>
                    </div>
                    <span className="text-sm font-medium">{item.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Upcoming This Week</h3>
              </div>
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Full scheduling features coming soon</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
