import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

const caregiverData = [
  { name: "Maria S.", fullName: "Maria Santos", score: 98, visits: 45, onTime: 96, satisfaction: 4.9, trend: 3 },
  { name: "David W.", fullName: "David Wilson", score: 95, visits: 38, onTime: 94, satisfaction: 4.8, trend: 2 },
  { name: "Sarah J.", fullName: "Sarah Johnson", score: 94, visits: 42, onTime: 92, satisfaction: 4.7, trend: -1 },
  { name: "Michael B.", fullName: "Michael Brown", score: 91, visits: 28, onTime: 88, satisfaction: 4.6, trend: 5 },
  { name: "Emily D.", fullName: "Emily Davis", score: 89, visits: 35, onTime: 90, satisfaction: 4.5, trend: 1 },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: typeof caregiverData[0] }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border rounded-lg shadow-lg p-3 min-w-[180px]">
        <p className="font-semibold mb-2">{data.fullName}</p>
        <div className="space-y-1 text-sm">
          <p className="flex justify-between">
            <span className="text-muted-foreground">Performance:</span>
            <span className="font-medium">{data.score}%</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground">Total Visits:</span>
            <span className="font-medium">{data.visits}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground">On-Time Rate:</span>
            <span className="font-medium">{data.onTime}%</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground">Satisfaction:</span>
            <span className="font-medium">{data.satisfaction}/5</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const getBarColor = (score: number) => {
  if (score >= 95) return "hsl(160, 84%, 39%)";
  if (score >= 90) return "hsl(217, 91%, 60%)";
  return "hsl(38, 92%, 50%)";
};

export function CaregiverPerformanceChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Caregiver Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={caregiverData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                className="text-xs fill-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                className="text-xs fill-muted-foreground"
                width={70}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
              <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={30}>
                {caregiverData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {caregiverData.slice(0, 3).map((caregiver, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {caregiver.fullName.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{caregiver.fullName}</span>
                  {idx === 0 && (
                    <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                      Top Performer
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {caregiver.visits} visits • {caregiver.onTime}% on-time
                </p>
              </div>
              <div className="flex items-center gap-1">
                {caregiver.trend > 0 ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-destructive" />
                )}
                <span className={caregiver.trend > 0 ? "text-success text-sm" : "text-destructive text-sm"}>
                  {caregiver.trend > 0 ? "+" : ""}{caregiver.trend}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
