 import { useState, useEffect, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { useAuth } from "@/contexts/AuthContext";
 
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
 
 // Predefined common home care regulations by state
 export const PREDEFINED_REGULATIONS: Record<string, Array<{ name: string; description: string; code?: string; category: string }>> = {
   "California": [
     { name: "Home Care Aide Registration", description: "All home care aides must register with the Home Care Services Bureau", code: "HSC 1796.10", category: "Licensing" },
     { name: "Criminal Background Check", description: "Background checks required for all employees with client contact", code: "HSC 1796.22", category: "Employment" },
     { name: "Training Requirements", description: "Minimum 5 hours of initial training required", code: "HSC 1796.42", category: "Training" },
     { name: "Service Records", description: "Maintain accurate records of services provided", code: "CCR 22-73512", category: "Documentation" },
   ],
   "Texas": [
     { name: "Home and Community Support License", description: "License required to provide home health, hospice, or personal assistance services", code: "26 TAC 558", category: "Licensing" },
     { name: "Administrator Qualifications", description: "Agency administrator must meet education and experience requirements", code: "26 TAC 558.203", category: "Employment" },
     { name: "Competency Evaluation", description: "Staff competency must be evaluated annually", code: "26 TAC 558.401", category: "Training" },
     { name: "Incident Reporting", description: "Report incidents to HHSC within 24 hours", code: "26 TAC 558.283", category: "Compliance" },
   ],
   "Florida": [
     { name: "Home Health Agency License", description: "State license required to operate a home health agency", code: "Ch. 400 F.S.", category: "Licensing" },
     { name: "Level 2 Background Screening", description: "All employees must pass Level 2 background screening", code: "Ch. 435 F.S.", category: "Employment" },
     { name: "Home Health Aide Training", description: "75 hours of training required for home health aides", code: "59A-8.0095 F.A.C.", category: "Training" },
     { name: "Patient Rights", description: "Patients must be informed of their rights", code: "59A-8.0085 F.A.C.", category: "Compliance" },
   ],
   "New York": [
     { name: "Licensed Home Care Services Agency", description: "LHCSA license required from DOH", code: "PHL Article 36", category: "Licensing" },
     { name: "Aide Certification", description: "Home health aides must be certified", code: "10 NYCRR 766", category: "Employment" },
     { name: "In-Service Training", description: "12 hours of in-service training annually", code: "10 NYCRR 766.11", category: "Training" },
     { name: "Plan of Care", description: "Written plan of care required for each patient", code: "10 NYCRR 766.5", category: "Documentation" },
   ],
   "Pennsylvania": [
     { name: "Home Care Agency License", description: "License required from PA Department of Health", code: "28 Pa. Code Ch. 611", category: "Licensing" },
     { name: "Direct Care Worker Training", description: "Initial and ongoing training requirements", code: "28 Pa. Code 611.51", category: "Training" },
     { name: "Consumer Rights", description: "Consumer bill of rights must be provided", code: "28 Pa. Code 611.21", category: "Compliance" },
     { name: "Documentation Standards", description: "Service documentation requirements", code: "28 Pa. Code 611.55", category: "Documentation" },
   ],
  "Illinois": [
    { name: "Home Services Agency License", description: "License required from Illinois Department of Public Health", code: "77 Ill. Adm. Code 245", category: "Licensing" },
    { name: "Health Care Worker Background Check", description: "Fingerprint-based background check required", code: "225 ILCS 46", category: "Employment" },
    { name: "Home Health Aide Training", description: "120 hours of training required for home health aides", code: "77 Ill. Adm. Code 245.40", category: "Training" },
    { name: "Client Rights", description: "Written statement of rights must be provided to clients", code: "77 Ill. Adm. Code 245.60", category: "Compliance" },
  ],
  "Ohio": [
    { name: "Home Health Agency License", description: "Certificate of need and license from Ohio Department of Health", code: "ORC 3701.07", category: "Licensing" },
    { name: "Background Investigation", description: "Criminal records check required for all employees", code: "ORC 3721.121", category: "Employment" },
    { name: "Aide Competency Requirements", description: "Competency evaluation and training requirements", code: "OAC 3701-16-08", category: "Training" },
    { name: "Patient Care Records", description: "Clinical record requirements for each patient", code: "OAC 3701-16-12", category: "Documentation" },
  ],
  "Georgia": [
    { name: "Private Home Care Provider License", description: "License required from Georgia Department of Community Health", code: "O.C.G.A. § 31-7-300", category: "Licensing" },
    { name: "Criminal Background Check", description: "Background check required through Georgia Crime Information Center", code: "O.C.G.A. § 31-7-353", category: "Employment" },
    { name: "Personal Care Aide Training", description: "Minimum training requirements for personal care aides", code: "Ga. Comp. R. & Regs. 111-8-65", category: "Training" },
    { name: "Service Plan Documentation", description: "Written plan of care required for each client", code: "Ga. Comp. R. & Regs. 111-8-65-.08", category: "Documentation" },
  ],
 };
 
 export const US_STATES = [
   "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", 
   "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", 
   "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", 
   "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", 
   "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", 
   "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", 
   "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", 
   "Wisconsin", "Wyoming"
 ];
 
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
     deleteRegulation,
     generatePolicy,
     updatePolicyStatus,
     deletePolicy,
     getPoliciesForRegulation,
     refetch: fetchRegulations,
   };
 }