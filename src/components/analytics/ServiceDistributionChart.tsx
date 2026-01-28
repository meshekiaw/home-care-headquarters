import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const serviceData = [
  { service: "Personal Care", value: 85, fullMark: 100 },
  { service: "Medication Mgmt", value: 78, fullMark: 100 },
  { service: "Companionship", value: 92, fullMark: 100 },
  { service: "Meal Prep", value: 70, fullMark: 100 },
  { service: "Light Housekeeping", value: 65, fullMark: 100 },
  { service: "Transportation", value: 55, fullMark: 100 },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border rounded-lg shadow-lg p-3">
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-muted-foreground">{payload[0].value}% of visits include this service</p>
      </div>
    );
  }
  return null;
};

export function ServiceDistributionChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Service Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={serviceData}>
              <PolarGrid className="stroke-muted" />
              <PolarAngleAxis
                dataKey="service"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                className="text-xs fill-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Radar
                name="Services"
                dataKey="value"
                stroke="hsl(217, 91%, 60%)"
                fill="hsl(217, 91%, 60%)"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          {serviceData.map((service, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/50">
              <span className="text-sm truncate">{service.service}</span>
              <span className="text-sm font-medium">{service.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
