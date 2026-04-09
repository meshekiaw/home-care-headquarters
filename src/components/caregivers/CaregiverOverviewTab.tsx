import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, DollarSign, Award, Clock, Briefcase, Calendar, Shield } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";

interface CaregiverOverviewTabProps {
  caregiver: Tables<"caregivers">;
  credentials: Tables<"caregiver_credentials">[];
  skills: Tables<"caregiver_skills">[];
  availability: Tables<"caregiver_availability">[];
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function CaregiverOverviewTab({
  caregiver,
  credentials,
  skills,
  availability,
}: CaregiverOverviewTabProps) {
  const activeCredentials = credentials.filter((c) => c.status === "active");
  const expertSkills = skills.filter((s) => s.proficiency_level === "expert" || s.proficiency_level === "advanced");
  
  // Group availability by day
  const availabilityByDay = DAYS.map((day, index) => {
    const slots = availability.filter((a) => a.day_of_week === index && a.is_available);
    return { day, slots };
  });

  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{caregiver.phone || "Not provided"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{caregiver.email || "Not provided"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="font-medium">
                {(caregiver as any).date_of_birth
                  ? format(new Date((caregiver as any).date_of_birth + "T00:00:00"), "MM/dd/yyyy")
                  : "Not provided"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">SSN</p>
              <p className="font-medium">
                {(caregiver as any).ssn
                  ? `***-**-${(caregiver as any).ssn.slice(-4)}`
                  : "Not provided"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hourly Rate</p>
              <p className="font-medium">
                {caregiver.hourly_rate ? `$${caregiver.hourly_rate}/hr` : "Not set"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Specializations</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {caregiver.specializations?.length ? (
                  caregiver.specializations.map((spec, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {spec}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">None specified</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Award className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCredentials.length}</p>
                <p className="text-sm text-muted-foreground">Active Credentials</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{expertSkills.length}</p>
                <p className="text-sm text-muted-foreground">Expert Skills</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {availability.filter((a) => a.is_available).length}
                </p>
                <p className="text-sm text-muted-foreground">Available Slots</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Availability Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekly Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {availabilityByDay.map(({ day, slots }) => (
              <div key={day} className="flex items-center gap-4 py-2 border-b border-border last:border-0">
                <span className="w-24 font-medium text-sm">{day}</span>
                <div className="flex-1">
                  {slots.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {slots.map((slot) => (
                        <Badge key={slot.id} variant="outline" className="text-xs">
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unavailable</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Skills */}
      {skills.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {skills.slice(0, 8).map((skill) => (
                <Badge
                  key={skill.id}
                  variant={skill.proficiency_level === "expert" ? "default" : "secondary"}
                  className="text-sm"
                >
                  {skill.skill_name}
                  {skill.is_certified && " ✓"}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
