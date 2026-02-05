 import { useState, useEffect, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { useAuth } from "@/contexts/AuthContext";

// Re-export from centralized data file
export { PREDEFINED_REGULATIONS, US_STATES } from "@/data/stateRegulations";
 
 export interface StateRegulation {
   id: string;
   user_id: string;
   state: string;
   regulation_name: string;
   regulation_description: string | null;
   regulation_code: string | null;
   category: string | null;
   source_url: string | null;
   effective_date: string | null;
   is_predefined: boolean;
   created_at: string;
   updated_at: string;
 }
 
 export interface GeneratedPolicy {
   id: string;
   user_id: string;
   regulation_id: string;
   title: string;
   content: string;
   status: string;
   version: number;
   approved_at: string | null;
   approved_by: string | null;
   created_at: string;
   updated_at: string;
 }
 
 export function useStateRegulations() {
   const { toast } = useToast();
   const { user } = useAuth();
   const [regulations, setRegulations] = useState<StateRegulation[]>([]);
   const [policies, setPolicies] = useState<GeneratedPolicy[]>([]);
   const [loading, setLoading] = useState(true);
   const [generatingPolicy, setGeneratingPolicy] = useState<string | null>(null);
 
   const fetchRegulations = useCallback(async () => {
     if (!user) return;
     
     setLoading(true);
     try {
       const [regulationsResult, policiesResult] = await Promise.all([
         supabase
           .from('state_regulations')
           .select('*')
           .order('state', { ascending: true })
           .order('regulation_name', { ascending: true }),
         supabase
           .from('generated_policies')
           .select('*')
           .order('created_at', { ascending: false }),
       ]);
 
       if (regulationsResult.error) throw regulationsResult.error;
       if (policiesResult.error) throw policiesResult.error;
 
       setRegulations(regulationsResult.data || []);
       setPolicies(policiesResult.data || []);
     } catch (error: any) {
       toast({
         title: "Error loading regulations",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setLoading(false);
     }
   }, [user, toast]);
 
   useEffect(() => {
     fetchRegulations();
   }, [fetchRegulations]);
 
   const addRegulation = async (regulation: Omit<StateRegulation, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
     if (!user) return null;
 
     try {
       const { data, error } = await supabase
         .from('state_regulations')
         .insert({
           ...regulation,
           user_id: user.id,
         })
         .select()
         .single();
 
       if (error) throw error;
 
       setRegulations(prev => [...prev, data]);
       toast({
         title: "Regulation added",
         description: `${regulation.regulation_name} has been added.`,
       });
       return data;
     } catch (error: any) {
       toast({
         title: "Error adding regulation",
         description: error.message,
         variant: "destructive",
       });
       return null;
     }
   };
 
  const bulkAddRegulations = async (regulations: Omit<StateRegulation, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]) => {
    if (!user) return [];

    try {
      const regsWithUserId = regulations.map(reg => ({
        ...reg,
        user_id: user.id,
      }));

      const { data, error } = await supabase
        .from('state_regulations')
        .insert(regsWithUserId)
        .select();

      if (error) throw error;

      setRegulations(prev => [...prev, ...(data || [])]);
      toast({
        title: "Regulations added",
        description: `${data?.length || 0} regulations have been added.`,
      });
      return data || [];
    } catch (error: any) {
      toast({
        title: "Error adding regulations",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }
  };

   const deleteRegulation = async (id: string) => {
     try {
       const { error } = await supabase
         .from('state_regulations')
         .delete()
         .eq('id', id);
 
       if (error) throw error;
 
       setRegulations(prev => prev.filter(r => r.id !== id));
       setPolicies(prev => prev.filter(p => p.regulation_id !== id));
       toast({
         title: "Regulation deleted",
         description: "The regulation and its policies have been removed.",
       });
     } catch (error: any) {
       toast({
         title: "Error deleting regulation",
         description: error.message,
         variant: "destructive",
       });
     }
   };
 
   const generatePolicy = async (regulation: StateRegulation) => {
     if (!user) return null;
 
     setGeneratingPolicy(regulation.id);
     try {
       const { data, error } = await supabase.functions.invoke('generate-policy', {
         body: { regulation },
       });
 
       if (error) throw error;
       if (data.error) throw new Error(data.error);
 
       // Save the generated policy to the database
       const { data: savedPolicy, error: saveError } = await supabase
         .from('generated_policies')
         .insert({
           user_id: user.id,
           regulation_id: regulation.id,
           title: data.title,
           content: data.content,
           status: 'draft',
         })
         .select()
         .single();
 
       if (saveError) throw saveError;
 
       setPolicies(prev => [savedPolicy, ...prev]);
       toast({
         title: "Policy generated",
         description: "AI has created a policy document for this regulation.",
       });
       return savedPolicy;
     } catch (error: any) {
       toast({
         title: "Error generating policy",
         description: error.message,
         variant: "destructive",
       });
       return null;
     } finally {
       setGeneratingPolicy(null);
     }
   };
 
   const updatePolicyStatus = async (policyId: string, status: string, approvedBy?: string) => {
     try {
       const updateData: any = { status };
       if (status === 'approved') {
         updateData.approved_at = new Date().toISOString();
         updateData.approved_by = approvedBy || 'Admin';
       }
 
       const { data, error } = await supabase
         .from('generated_policies')
         .update(updateData)
         .eq('id', policyId)
         .select()
         .single();
 
       if (error) throw error;
 
       setPolicies(prev => prev.map(p => p.id === policyId ? data : p));
       toast({
         title: "Policy updated",
         description: `Policy status changed to ${status}.`,
       });
     } catch (error: any) {
       toast({
         title: "Error updating policy",
         description: error.message,
         variant: "destructive",
       });
     }
   };
 
   const deletePolicy = async (policyId: string) => {
     try {
       const { error } = await supabase
         .from('generated_policies')
         .delete()
         .eq('id', policyId);
 
       if (error) throw error;
 
       setPolicies(prev => prev.filter(p => p.id !== policyId));
       toast({
         title: "Policy deleted",
         description: "The policy has been removed.",
       });
     } catch (error: any) {
       toast({
         title: "Error deleting policy",
         description: error.message,
         variant: "destructive",
       });
     }
   };
 
   const getPoliciesForRegulation = (regulationId: string) => {
     return policies.filter(p => p.regulation_id === regulationId);
   };
 
   return {
     regulations,
     policies,
     loading,
     generatingPolicy,
     addRegulation,
    bulkAddRegulations,
     deleteRegulation,
     generatePolicy,
     updatePolicyStatus,
     deletePolicy,
     getPoliciesForRegulation,
     refetch: fetchRegulations,
   };
 }