import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Navigation,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useProximityMatching } from "@/hooks/useProximityMatching";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ProximityMatchTabProps {
  clientId: string;
  onAssign?: () => void;
}

export default function ProximityMatchTab({ clientId, onAssign }: ProximityMatchTabProps) {
  const { client, matches, loading, refetch } = useProximityMatching(clientId);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleQuickAssign = async (caregiverId: string) => {
    if (!user) return;

    try {
      // Check if already assigned
      const { data: existing } = await supabase
        .from('client_caregivers')
        .select('id')
        .eq('client_id', clientId)
        .eq('caregiver_id', caregiverId)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Already assigned",
          description: "This caregiver is already assigned to this client.",
          variant: "default",
        });
        return;
      }

      const { error } = await supabase
        .from('client_caregivers')
        .insert({
          client_id: clientId,
          caregiver_id: caregiverId,
          user_id: user.id,
          role: 'primary',
        });

      if (error) throw error;

      toast({ title: "Caregiver assigned successfully" });
      onAssign?.();
    } catch (error: any) {
      toast({
        title: "Error assigning caregiver",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getMatchBadge = (matchLevel: 'exact' | 'city' | 'state' | 'none', score: number) => {
    switch (matchLevel) {
      case 'exact':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Exact Match ({score}%)
          </Badge>
        );
      case 'city':
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            <Navigation className="w-3 h-3 mr-1" />
            City Match ({score}%)
          </Badge>
        );
      case 'state':
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            <MapPin className="w-3 h-3 mr-1" />
            State Match ({score}%)
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const hasClientLocation = client?.city || client?.state || client?.zip_code;

  return (
    <div className="space-y-6">
      {/* Client Location Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Client Location
              </CardTitle>
              <CardDescription>
                {client?.first_name} {client?.last_name}'s service address
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {hasClientLocation ? (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                {client?.address && <p className="font-medium">{client.address}</p>}
                <p className="text-muted-foreground">
                  {[client?.city, client?.state, client?.zip_code].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-lg border border-dashed">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">No location set</p>
                <p className="text-sm text-muted-foreground">
                  Add an address to the client profile to see nearby caregivers
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nearby Caregivers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            Nearby Caregivers
          </CardTitle>
          <CardDescription>
            Caregivers sorted by proximity to client location
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasClientLocation ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Location Required</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Set a location for this client to find nearby caregivers based on geographic proximity.
              </p>
            </div>
          ) : matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <User className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No Nearby Caregivers</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                No caregivers found in the client's area. Add location information to caregiver profiles to enable proximity matching.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((match, index) => (
                <div 
                  key={match.caregiver.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {match.caregiver.first_name.charAt(0)}{match.caregiver.last_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {match.caregiver.first_name} {match.caregiver.last_name}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        {match.caregiver.city && match.caregiver.state && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {match.caregiver.city}, {match.caregiver.state}
                          </span>
                        )}
                        <span>•</span>
                        <span>{match.distance}</span>
                      </div>
                      {match.caregiver.specializations && match.caregiver.specializations.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {match.caregiver.specializations.slice(0, 3).map((spec) => (
                            <Badge key={spec} variant="outline" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                          {match.caregiver.specializations.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{match.caregiver.specializations.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end gap-2">
                      {getMatchBadge(match.matchLevel, match.proximityScore)}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {match.caregiver.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {match.caregiver.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleQuickAssign(match.caregiver.id)}
                    >
                      Assign
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Proximity matching works best when both clients and caregivers have complete address information. 
            Add city, state, and zip code to caregiver profiles through their profile page to improve match accuracy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
