import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserCheck, Plus, Search, Star, Phone, Mail } from "lucide-react";

export default function Caregivers() {
  const caregivers = [
    { name: "Maria Santos", specialty: "Senior Care", rating: 4.9, clients: 8, status: "active" },
    { name: "David Wilson", specialty: "Physical Therapy", rating: 4.8, clients: 6, status: "active" },
    { name: "Sarah Johnson", specialty: "Dementia Care", rating: 4.9, clients: 5, status: "active" },
    { name: "Michael Brown", specialty: "Pediatric Care", rating: 4.7, clients: 4, status: "on-leave" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Caregivers</h2>
            <p className="text-muted-foreground">Manage your caregiver team and credentials</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Caregiver
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search caregivers..." className="pl-10" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {caregivers.map((caregiver, idx) => (
            <Card key={idx} className="hover:shadow-elevated transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{caregiver.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        caregiver.status === 'active' 
                          ? 'bg-success/10 text-success' 
                          : 'bg-warning/10 text-warning'
                      }`}>
                        {caregiver.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{caregiver.specialty}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-warning fill-warning" />
                        <span className="text-sm font-medium">{caregiver.rating}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{caregiver.clients} clients</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Phone className="w-4 h-4 mr-1" />
                    Call
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Mail className="w-4 h-4 mr-1" />
                    Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
