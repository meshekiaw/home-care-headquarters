import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Caregiver = Tables<"caregivers">;
type CaregiverCredential = Tables<"caregiver_credentials">;
type CaregiverAvailability = Tables<"caregiver_availability">;
type CaregiverSkill = Tables<"caregiver_skills">;

export interface CaregiverWithDetails extends Caregiver {
  credentials?: CaregiverCredential[];
  availability?: CaregiverAvailability[];
  skills?: CaregiverSkill[];
}

export function useCaregivers() {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCaregivers = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("caregivers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCaregivers(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching caregivers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCaregiver = async (caregiver: Omit<TablesInsert<"caregivers">, "user_id">) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("caregivers")
        .insert({ ...caregiver, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      
      setCaregivers((prev) => [data, ...prev]);
      toast({ title: "Caregiver added successfully" });
      return data;
    } catch (error: any) {
      toast({
        title: "Error adding caregiver",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const updateCaregiver = async (id: string, updates: TablesUpdate<"caregivers">) => {
    try {
      const { data, error } = await supabase
        .from("caregivers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      setCaregivers((prev) => prev.map((c) => (c.id === id ? data : c)));
      toast({ title: "Caregiver updated successfully" });
      return data;
    } catch (error: any) {
      toast({
        title: "Error updating caregiver",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteCaregiver = async (id: string) => {
    try {
      const { error } = await supabase.from("caregivers").delete().eq("id", id);
      if (error) throw error;
      
      setCaregivers((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Caregiver removed successfully" });
      return true;
    } catch (error: any) {
      toast({
        title: "Error removing caregiver",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchCaregivers();
  }, [user]);

  return {
    caregivers,
    loading,
    createCaregiver,
    updateCaregiver,
    deleteCaregiver,
    refetch: fetchCaregivers,
  };
}

export function useCaregiverDetails(caregiverId: string | null) {
  const [caregiver, setCaregiver] = useState<CaregiverWithDetails | null>(null);
  const [credentials, setCredentials] = useState<CaregiverCredential[]>([]);
  const [availability, setAvailability] = useState<CaregiverAvailability[]>([]);
  const [skills, setSkills] = useState<CaregiverSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchDetails = async () => {
    if (!caregiverId || !user) {
      setLoading(false);
      return;
    }

    try {
      const [caregiverRes, credentialsRes, availabilityRes, skillsRes] = await Promise.all([
        supabase.from("caregivers").select("*").eq("id", caregiverId).maybeSingle(),
        supabase.from("caregiver_credentials").select("*").eq("caregiver_id", caregiverId).order("expiry_date"),
        supabase.from("caregiver_availability").select("*").eq("caregiver_id", caregiverId).order("day_of_week"),
        supabase.from("caregiver_skills").select("*").eq("caregiver_id", caregiverId).order("skill_name"),
      ]);

      if (caregiverRes.error) throw caregiverRes.error;
      
      setCaregiver(caregiverRes.data);
      setCredentials(credentialsRes.data || []);
      setAvailability(availabilityRes.data || []);
      setSkills(skillsRes.data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching caregiver details",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Credential operations
  const addCredential = async (credential: Omit<TablesInsert<"caregiver_credentials">, "user_id" | "caregiver_id">) => {
    if (!caregiverId || !user) return null;

    try {
      const { data, error } = await supabase
        .from("caregiver_credentials")
        .insert({ ...credential, caregiver_id: caregiverId, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      setCredentials((prev) => [...prev, data]);
      toast({ title: "Credential added successfully" });
      return data;
    } catch (error: any) {
      toast({ title: "Error adding credential", description: error.message, variant: "destructive" });
      return null;
    }
  };

  const updateCredential = async (id: string, updates: TablesUpdate<"caregiver_credentials">) => {
    try {
      const { data, error } = await supabase
        .from("caregiver_credentials")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      setCredentials((prev) => prev.map((c) => (c.id === id ? data : c)));
      toast({ title: "Credential updated successfully" });
      return data;
    } catch (error: any) {
      toast({ title: "Error updating credential", description: error.message, variant: "destructive" });
      return null;
    }
  };

  const deleteCredential = async (id: string) => {
    try {
      const { error } = await supabase.from("caregiver_credentials").delete().eq("id", id);
      if (error) throw error;
      setCredentials((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Credential removed successfully" });
      return true;
    } catch (error: any) {
      toast({ title: "Error removing credential", description: error.message, variant: "destructive" });
      return false;
    }
  };

  // Availability operations
  const setAvailabilitySlot = async (slot: Omit<TablesInsert<"caregiver_availability">, "user_id" | "caregiver_id">) => {
    if (!caregiverId || !user) return null;

    try {
      const { data, error } = await supabase
        .from("caregiver_availability")
        .upsert(
          { ...slot, caregiver_id: caregiverId, user_id: user.id },
          { onConflict: "caregiver_id,day_of_week,start_time" }
        )
        .select()
        .single();

      if (error) throw error;
      await fetchDetails();
      toast({ title: "Availability updated successfully" });
      return data;
    } catch (error: any) {
      toast({ title: "Error updating availability", description: error.message, variant: "destructive" });
      return null;
    }
  };

  const deleteAvailabilitySlot = async (id: string) => {
    try {
      const { error } = await supabase.from("caregiver_availability").delete().eq("id", id);
      if (error) throw error;
      setAvailability((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Availability slot removed" });
      return true;
    } catch (error: any) {
      toast({ title: "Error removing availability", description: error.message, variant: "destructive" });
      return false;
    }
  };

  // Skills operations
  const addSkill = async (skill: Omit<TablesInsert<"caregiver_skills">, "user_id" | "caregiver_id">) => {
    if (!caregiverId || !user) return null;

    try {
      const { data, error } = await supabase
        .from("caregiver_skills")
        .insert({ ...skill, caregiver_id: caregiverId, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      setSkills((prev) => [...prev, data]);
      toast({ title: "Skill added successfully" });
      return data;
    } catch (error: any) {
      toast({ title: "Error adding skill", description: error.message, variant: "destructive" });
      return null;
    }
  };

  const updateSkill = async (id: string, updates: TablesUpdate<"caregiver_skills">) => {
    try {
      const { data, error } = await supabase
        .from("caregiver_skills")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      setSkills((prev) => prev.map((s) => (s.id === id ? data : s)));
      toast({ title: "Skill updated successfully" });
      return data;
    } catch (error: any) {
      toast({ title: "Error updating skill", description: error.message, variant: "destructive" });
      return null;
    }
  };

  const deleteSkill = async (id: string) => {
    try {
      const { error } = await supabase.from("caregiver_skills").delete().eq("id", id);
      if (error) throw error;
      setSkills((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Skill removed successfully" });
      return true;
    } catch (error: any) {
      toast({ title: "Error removing skill", description: error.message, variant: "destructive" });
      return false;
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [caregiverId, user]);

  return {
    caregiver,
    credentials,
    availability,
    skills,
    loading,
    addCredential,
    updateCredential,
    deleteCredential,
    setAvailabilitySlot,
    deleteAvailabilitySlot,
    addSkill,
    updateSkill,
    deleteSkill,
    refetch: fetchDetails,
  };
}
