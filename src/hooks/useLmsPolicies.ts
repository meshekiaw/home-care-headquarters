import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface LmsPolicy {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  content: string;
  category: string | null;
  version: number;
  effective_date: string;
  is_active: boolean;
  requires_acknowledgment: boolean;
  created_at: string;
  updated_at: string;
}

export interface LmsPolicyAcknowledgment {
  id: string;
  user_id: string;
  policy_id: string;
  caregiver_id: string;
  acknowledged_at: string;
  ip_address: string | null;
  notes: string | null;
  caregiver?: {
    first_name: string;
    last_name: string;
    email: string | null;
  };
}

export function useLmsPolicies() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [policies, setPolicies] = useState<LmsPolicy[]>([]);
  const [acknowledgments, setAcknowledgments] = useState<LmsPolicyAcknowledgment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const [policiesRes, acksRes] = await Promise.all([
        supabase.from("lms_policies").select("*").order("created_at", { ascending: false }),
        supabase.from("lms_policy_acknowledgments").select(`*, caregivers(first_name, last_name, email)`).order("acknowledged_at", { ascending: false }),
      ]);
      if (policiesRes.error) throw policiesRes.error;
      if (acksRes.error) throw acksRes.error;
      setPolicies((policiesRes.data as LmsPolicy[]) || []);
      const processedAcks = (acksRes.data || []).map((a: any) => ({ ...a, caregiver: a.caregivers }));
      setAcknowledgments(processedAcks);
    } catch (error: any) {
      toast({ title: "Error loading policies", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

  const addPolicy = async (policy: Partial<LmsPolicy>) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("lms_policies").insert({ ...policy, user_id: user.id } as any);
      if (error) throw error;
      toast({ title: "Policy created" });
      fetchPolicies();
    } catch (error: any) {
      toast({ title: "Error creating policy", description: error.message, variant: "destructive" });
    }
  };

  const updatePolicy = async (id: string, updates: Partial<LmsPolicy>) => {
    try {
      const { error } = await supabase.from("lms_policies").update(updates as any).eq("id", id);
      if (error) throw error;
      toast({ title: "Policy updated" });
      fetchPolicies();
    } catch (error: any) {
      toast({ title: "Error updating policy", description: error.message, variant: "destructive" });
    }
  };

  const deletePolicy = async (id: string) => {
    try {
      const { error } = await supabase.from("lms_policies").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Policy deleted" });
      fetchPolicies();
    } catch (error: any) {
      toast({ title: "Error deleting policy", description: error.message, variant: "destructive" });
    }
  };

  const recordAcknowledgment = async (policyId: string, caregiverId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("lms_policy_acknowledgments").insert({
        user_id: user.id,
        policy_id: policyId,
        caregiver_id: caregiverId,
      } as any);
      if (error) throw error;
      toast({ title: "Acknowledgment recorded" });
      fetchPolicies();
    } catch (error: any) {
      toast({ title: "Error recording acknowledgment", description: error.message, variant: "destructive" });
    }
  };

  const getAcknowledgmentsForPolicy = (policyId: string) =>
    acknowledgments.filter((a) => a.policy_id === policyId);

  const getCaregiverAcknowledgments = (caregiverId: string) =>
    acknowledgments.filter((a) => a.caregiver_id === caregiverId);

  return {
    policies,
    acknowledgments,
    loading,
    addPolicy,
    updatePolicy,
    deletePolicy,
    recordAcknowledgment,
    getAcknowledgmentsForPolicy,
    getCaregiverAcknowledgments,
    refetch: fetchPolicies,
  };
}
