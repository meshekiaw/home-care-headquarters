import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

const satisfactionData = [
  { name: "Excellent (5★)", value: 45, rating: 5 },
  { name: "Very Good (4★)", value: 32, rating: 4 },
  { name: "Good (3★)", value: 15, rating: 3 },
  { name: "Fair (2★)", value: 6, rating: 2 },
  { name: "Poor (1★)", value: 2, rating: 1 },
];

const COLORS = [
  "hsl(160, 84%, 39%)",  // Excellent - green
  "hsl(160, 60%, 50%)",  // Very Good - lighter green
  "hsl(217, 91%, 60%)",  // Good - primary blue
  "hsl(38, 92%, 50%)",   // Fair - warning
  "hsl(0, 84%, 60%)",    // Poor - destructive
];

const recentFeedback = [
  { client: "Eleanor Thompson", rating: 5, comment: "Maria is wonderful! Always on time and so caring.", caregiver: "Maria Santos", date: "2 days ago" },
  { client: "Robert Chen", rating: 5, comment: "David goes above and beyond. Highly recommend.", caregiver: "David Wilson", date: "3 days ago" },
  { client: "Patricia Williams", rating: 4, comment: "Good service overall, just a few scheduling hiccups.", caregiver: "Sarah Johnson", date: "5 days ago" },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: typeof satisfactionData[0] }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border rounded-lg shadow-lg p-3">
        <p className="font-semibold">{data.name}</p>
        <p className="text-sm text-muted-foreground">{data.value}% of responses</p>
      </div>
    );
  }
  return null;
};

export function ClientSatisfactionChart() {
  const averageRating = (
    satisfactionData.reduce((acc, item) => acc + item.rating * item.value, 0) /
    satisfactionData.reduce((acc, item) => acc + item.value, 0)
  ).toFixed(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Client Satisfaction</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          {/* Pie Chart */}
          <div className="h-[200px] w-[200px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={satisfactionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {satisfactionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-warning text-warning" />
                <span className="text-2xl font-bold">{averageRating}</span>
              </div>
              <p className="text-xs text-muted-foreground">Average Rating</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {satisfactionData.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[index] }}
                />
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm">{item.name}</span>
                  <span className="text-sm font-medium">{item.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Feedback */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-medium mb-3">Recent Feedback</h4>
          <div className="space-y-3">
            {recentFeedback.map((feedback, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{feedback.client}</span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < feedback.rating
                                ? "fill-warning text-warning"
                                : "fill-muted text-muted"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{feedback.comment}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Caregiver: {feedback.caregiver} • {feedback.date}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
