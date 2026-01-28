import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CaregiverLocation {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  service_radius_miles: number | null;
  specializations: string[] | null;
}

interface ClientLocation {
  id: string;
  first_name: string;
  last_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
}

interface ProximityMatch {
  caregiver: CaregiverLocation;
  proximityScore: number;
  matchLevel: 'exact' | 'city' | 'state' | 'none';
  distance: string;
}

// Simple proximity scoring based on location matching
// In production, you'd want to use a geocoding API for actual distance calculations
function calculateProximityScore(
  caregiver: CaregiverLocation,
  client: ClientLocation
): { score: number; matchLevel: 'exact' | 'city' | 'state' | 'none'; distance: string } {
  // Exact zip code match - highest score
  if (caregiver.zip_code && client.zip_code && 
      caregiver.zip_code.trim() === client.zip_code.trim()) {
    return { score: 100, matchLevel: 'exact', distance: 'Same area' };
  }

  // Same city match - high score
  if (caregiver.city && client.city && 
      caregiver.city.toLowerCase().trim() === client.city.toLowerCase().trim() &&
      caregiver.state && client.state &&
      caregiver.state.toLowerCase().trim() === client.state.toLowerCase().trim()) {
    return { score: 80, matchLevel: 'city', distance: 'Same city' };
  }

  // Adjacent zip codes (first 3 digits match) - medium-high score
  if (caregiver.zip_code && client.zip_code && 
      caregiver.zip_code.substring(0, 3) === client.zip_code.substring(0, 3)) {
    return { score: 60, matchLevel: 'city', distance: 'Nearby area' };
  }

  // Same state match - medium score
  if (caregiver.state && client.state && 
      caregiver.state.toLowerCase().trim() === client.state.toLowerCase().trim()) {
    return { score: 40, matchLevel: 'state', distance: 'Same state' };
  }

  // No location match
  return { score: 0, matchLevel: 'none', distance: 'Different region' };
}

export function useProximityMatching(clientId: string | null) {
  const { toast } = useToast();
  const [client, setClient] = useState<ClientLocation | null>(null);
  const [matches, setMatches] = useState<ProximityMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProximityMatches = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch client location
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, first_name, last_name, address, city, state, zip_code')
        .eq('id', clientId)
        .maybeSingle();

      if (clientError) throw clientError;
      if (!clientData) {
        setLoading(false);
        return;
      }

      setClient(clientData);

      // Fetch all active caregivers with location data
      const { data: caregivers, error: caregiversError } = await supabase
        .from('caregivers')
        .select('id, first_name, last_name, email, phone, status, address, city, state, zip_code, service_radius_miles, specializations')
        .eq('status', 'active');

      if (caregiversError) throw caregiversError;

      // Calculate proximity scores for each caregiver
      const proximityMatches: ProximityMatch[] = (caregivers || [])
        .map((caregiver) => {
          const { score, matchLevel, distance } = calculateProximityScore(caregiver, clientData);
          return {
            caregiver,
            proximityScore: score,
            matchLevel,
            distance,
          };
        })
        .filter(match => match.proximityScore > 0) // Only show caregivers with some location match
        .sort((a, b) => b.proximityScore - a.proximityScore);

      setMatches(proximityMatches);
    } catch (error: any) {
      toast({
        title: "Error loading proximity data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [clientId, toast]);

  useEffect(() => {
    fetchProximityMatches();
  }, [fetchProximityMatches]);

  return {
    client,
    matches,
    loading,
    refetch: fetchProximityMatches,
  };
}

export function useAllCaregiverLocations() {
  const { toast } = useToast();
  const [caregivers, setCaregivers] = useState<CaregiverLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCaregivers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('caregivers')
        .select('id, first_name, last_name, email, phone, status, address, city, state, zip_code, service_radius_miles, specializations')
        .eq('status', 'active')
        .order('last_name');

      if (error) throw error;
      setCaregivers(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading caregiver locations",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCaregivers();
  }, [fetchCaregivers]);

  return {
    caregivers,
    loading,
    refetch: fetchCaregivers,
  };
}
