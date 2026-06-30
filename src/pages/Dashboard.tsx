import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  UserCheck,
  Plus,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, addDays, format } from "date-fns";
 import ShiftRemindersWidget from "@/components/dashboard/ShiftRemindersWidget";
import NeedsActionNow from "@/components/dashboard/NeedsActionNow";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
}

function StatCard({ title, value, change, changeType = "neutral", icon: Icon }: StatCardProps) {
  return (
    <Card className="hover:shadow-elevated transition-shadow duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {change && (
              <p className={`text-sm mt-1 ${
                changeType === "positive" ? "text-success" : 
                changeType === "negative" ? "text-destructive" : 
                "text-muted-foreground"
              }`}>
                {change}
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [clientCount, setClientCount] = useState(0);
  const [caregiverCount, setCaregiverCount] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [expiringCredentials, setExpiringCredentials] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const today = new Date();
        const dayStart = startOfDay(today).toISOString();
        const dayEnd = endOfDay(today).toISOString();
        const thirtyDaysFromNow = format(addDays(today, 30), 'yyyy-MM-dd');
        const todayFormatted = format(today, 'yyyy-MM-dd');

        const [clientsResult, caregiversResult, appointmentsResult, credentialsResult] = await Promise.all([
          supabase
          .from('clients')
            .select('*', { count: 'exact', head: true }),
          supabase
            .from('caregivers')
            .select('*', { count: 'exact', head: true }),
          supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .gte('start_time', dayStart)
            .lte('start_time', dayEnd),
          supabase
            .from('caregiver_credentials')
            .select('*', { count: 'exact', head: true })
            .gte('expiry_date', todayFormatted)
            .lte('expiry_date', thirtyDaysFromNow)
        ]);

        setClientCount(clientsResult.count || 0);
        setCaregiverCount(caregiversResult.count || 0);
        setTodayAppointments(appointmentsResult.count || 0);
        setExpiringCredentials(credentialsResult.count || 0);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const alerts = [
    { type: "warning", message: "3 caregiver certifications expiring this week", time: "2 hours ago" },
    { type: "info", message: "New schedule conflict detected for tomorrow", time: "4 hours ago" },
    { type: "success", message: "Weekly compliance report generated", time: "Yesterday" },
  ];

  const upcomingVisits = [
    { client: "Eleanor Thompson", caregiver: "Maria Santos", time: "9:00 AM", status: "confirmed" },
    { client: "Robert Chen", caregiver: "David Wilson", time: "10:30 AM", status: "pending" },
    { client: "Patricia Davis", caregiver: "Sarah Johnson", time: "2:00 PM", status: "confirmed" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Welcome back!</h2>
            <p className="text-muted-foreground">Here's what's happening with your agency today.</p>
          </div>
          <Link to="/clients/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add New Client
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Active Clients" 
            value={loading ? "..." : clientCount}
            change="+12% from last month"
            changeType="positive"
            icon={Users}
          />
          <StatCard 
            title="Today's Appointments" 
            value={loading ? "..." : todayAppointments}
            icon={Calendar}
          />
          <StatCard 
            title="Active Caregivers" 
            value={loading ? "..." : caregiverCount}
            icon={UserCheck}
          />
          <StatCard 
            title="Expiring Credentials" 
            value={loading ? "..." : expiringCredentials}
            change="Next 30 days"
            changeType={expiringCredentials > 0 ? "negative" : "positive"}
            icon={AlertTriangle}
          />
        </div>

        {/* Needs Action Now */}
        <NeedsActionNow />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Alerts Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-semibold">Recent Alerts</CardTitle>
              <Button variant="ghost" size="sm">View all</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {alerts.map((alert, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    alert.type === "warning" ? "bg-warning" :
                    alert.type === "success" ? "bg-success" :
                    "bg-primary"
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Upcoming Visits */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-semibold">Upcoming Visits</CardTitle>
              <Link to="/scheduling">
                <Button variant="ghost" size="sm">
                  View schedule
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingVisits.map((visit, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{visit.client}</p>
                      <p className="text-xs text-muted-foreground">{visit.caregiver}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{visit.time}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      visit.status === "confirmed" 
                        ? "bg-success/10 text-success" 
                        : "bg-warning/10 text-warning"
                    }`}>
                      {visit.status}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

         {/* Shift Reminders & Notifications Widget */}
         <ShiftRemindersWidget />
 
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/clients/new" className="block">
                <div className="p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-center group">
                  <Users className="w-6 h-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-medium">Add Client</p>
                </div>
              </Link>
              <Link to="/scheduling" className="block">
                <div className="p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-center group">
                  <Calendar className="w-6 h-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-medium">Schedule Visit</p>
                </div>
              </Link>
              <Link to="/analytics" className="block">
                <div className="p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-center group">
                  <CheckCircle2 className="w-6 h-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-medium">View Reports</p>
                </div>
              </Link>
              <Link to="/communications" className="block">
                <div className="p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-center group">
                  <AlertTriangle className="w-6 h-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-medium">Send Message</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
