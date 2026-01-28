import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const monthlyData = [
  { month: "Jan", scheduled: 120, completed: 115, cancelled: 5 },
  { month: "Feb", scheduled: 135, completed: 128, cancelled: 7 },
  { month: "Mar", scheduled: 148, completed: 140, cancelled: 8 },
  { month: "Apr", scheduled: 162, completed: 155, cancelled: 7 },
  { month: "May", scheduled: 178, completed: 168, cancelled: 10 },
  { month: "Jun", scheduled: 185, completed: 175, cancelled: 10 },
  { month: "Jul", scheduled: 195, completed: 188, cancelled: 7 },
  { month: "Aug", scheduled: 210, completed: 200, cancelled: 10 },
  { month: "Sep", scheduled: 205, completed: 195, cancelled: 10 },
  { month: "Oct", scheduled: 220, completed: 210, cancelled: 10 },
  { month: "Nov", scheduled: 235, completed: 225, cancelled: 10 },
  { month: "Dec", scheduled: 245, completed: 232, cancelled: 13 },
];

const weeklyData = [
  { week: "Week 1", scheduled: 52, completed: 48, cancelled: 4 },
  { week: "Week 2", scheduled: 58, completed: 55, cancelled: 3 },
  { week: "Week 3", scheduled: 61, completed: 57, cancelled: 4 },
  { week: "Week 4", scheduled: 64, completed: 62, cancelled: 2 },
];

type TimeRange = "weekly" | "monthly";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border rounded-lg shadow-lg p-3">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="capitalize">{entry.name}:</span>
            <span className="font-medium">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function VisitTrendsChart() {
  const [timeRange, setTimeRange] = useState<TimeRange>("monthly");

  const data = timeRange === "monthly" ? monthlyData : weeklyData;
  const xKey = timeRange === "monthly" ? "month" : "week";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Visit Trends</CardTitle>
        <div className="flex gap-1 rounded-lg border p-1">
          <Button
            variant={timeRange === "weekly" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-3"
            onClick={() => setTimeRange("weekly")}
          >
            Weekly
          </Button>
          <Button
            variant={timeRange === "monthly" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-3"
            onClick={() => setTimeRange("monthly")}
          >
            Monthly
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey={xKey}
                axisLine={false}
                tickLine={false}
                className="text-xs fill-muted-foreground"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                className="text-xs fill-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: 20 }}
                formatter={(value) => (
                  <span className="text-sm capitalize text-foreground">{value}</span>
                )}
              />
              <Area
                type="monotone"
                dataKey="scheduled"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorScheduled)"
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="hsl(160, 84%, 39%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCompleted)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
