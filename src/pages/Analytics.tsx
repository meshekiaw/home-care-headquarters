import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  CheckCircle2,
  Download,
  Calendar,
  FileText,
} from "lucide-react";
import { VisitTrendsChart } from "@/components/analytics/VisitTrendsChart";
import { CaregiverPerformanceChart } from "@/components/analytics/CaregiverPerformanceChart";
import { ClientSatisfactionChart } from "@/components/analytics/ClientSatisfactionChart";
import { ServiceDistributionChart } from "@/components/analytics/ServiceDistributionChart";

export default function Analytics() {
  const [dateRange, setDateRange] = useState("30d");

  const stats = [
    { 
      label: "Total Visits", 
      value: "1,247", 
      change: "+12%", 
      positive: true, 
      icon: Calendar,
      description: "This month"
    },
    { 
      label: "Active Clients", 
      value: "89", 
      change: "+5%", 
      positive: true, 
      icon: Users,
      description: "Currently active"
    },
    { 
      label: "Avg Response Time", 
      value: "2.3h", 
      change: "-18%", 
      positive: true, 
      icon: Clock,
      description: "Request to assignment"
    },
    { 
      label: "Client Satisfaction", 
      value: "4.8/5", 
      change: "+0.2", 
      positive: true, 
      icon: CheckCircle2,
      description: "Average rating"
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Analytics & Reports</h2>
            <p className="text-muted-foreground">Track performance and generate insights</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, idx) => (
            <Card key={idx} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1 text-sm font-medium ${
                        stat.positive ? 'text-success' : 'text-destructive'
                      }`}>
                        {stat.positive ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {stat.change}
                      </div>
                      <span className="text-xs text-muted-foreground">vs last period</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 lg:grid-cols-2">
          <VisitTrendsChart />
          <CaregiverPerformanceChart />
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ClientSatisfactionChart />
          <ServiceDistributionChart />
        </div>
      </div>
    </DashboardLayout>
  );
}
