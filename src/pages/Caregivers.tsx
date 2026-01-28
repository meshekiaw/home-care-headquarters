import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCaregivers } from "@/hooks/useCaregivers";

import AddCaregiverDialog from "@/components/caregivers/AddCaregiverDialog";
import { UserCheck, Plus, Search, Phone, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

export default function Caregivers() {
  const { caregivers, loading, createCaregiver, refetch } = useCaregivers();
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const navigate = useNavigate();

  const filteredCaregivers = caregivers.filter((caregiver) => {
    const fullName = `${caregiver.first_name} ${caregiver.last_name}`.toLowerCase();
    const specializations = caregiver.specializations?.join(" ").toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || specializations.includes(query);
  });

  const handleViewProfile = (caregiver: Tables<"caregivers">) => {
    navigate(`/caregivers/${caregiver.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success";
      case "on-leave":
        return "bg-warning/10 text-warning";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Caregivers</h2>
            <p className="text-muted-foreground">
              Manage your caregiver team, credentials, and availability
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Caregiver
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search caregivers..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, idx) => (
              <Card key={idx}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCaregivers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <UserCheck className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? "No caregivers found" : "No caregivers yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "Add your first caregiver to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Caregiver
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCaregivers.map((caregiver) => (
              <Card
                key={caregiver.id}
                className="hover:shadow-elevated transition-shadow cursor-pointer"
                onClick={() => handleViewProfile(caregiver)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCheck className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold truncate">
                          {caregiver.first_name} {caregiver.last_name}
                        </h3>
                        <Badge className={`text-xs flex-shrink-0 ${getStatusColor(caregiver.status)}`}>
                          {caregiver.status}
                        </Badge>
                      </div>
                      {caregiver.specializations && caregiver.specializations.length > 0 && (
                        <p className="text-sm text-muted-foreground truncate">
                          {caregiver.specializations[0]}
                          {caregiver.specializations.length > 1 && ` +${caregiver.specializations.length - 1}`}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3">
                        {caregiver.hourly_rate && (
                          <span className="text-sm font-medium text-primary">
                            ${caregiver.hourly_rate}/hr
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (caregiver.phone) window.location.href = `tel:${caregiver.phone}`;
                      }}
                      disabled={!caregiver.phone}
                    >
                      <Phone className="w-4 h-4 mr-1" />
                      Call
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (caregiver.email) window.location.href = `mailto:${caregiver.email}`;
                      }}
                      disabled={!caregiver.email}
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AddCaregiverDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={createCaregiver}
      />
    </DashboardLayout>
  );
}
