import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RequiredSkill {
  id: string;
  skill_name: string;
  priority: string;
  minimum_proficiency: string | null;
  requires_certification: boolean | null;
  notes: string | null;
}

interface CaregiverSkill {
  skill_name: string;
  proficiency_level: string;
  is_certified: boolean | null;
  years_experience: number | null;
}

interface MatchedCaregiver {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  hourly_rate: number | null;
  skills: CaregiverSkill[];
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  partialMatches: string[];
}

const PROFICIENCY_LEVELS: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

export function useClientRequiredSkills(clientId: string) {
  const { toast } = useToast();
  const [requiredSkills, setRequiredSkills] = useState<RequiredSkill[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequiredSkills = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('client_required_skills')
        .select('*')
        .eq('client_id', clientId)
        .order('priority', { ascending: true });

      if (error) throw error;
      setRequiredSkills(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading required skills",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [clientId, toast]);

  useEffect(() => {
    fetchRequiredSkills();
  }, [fetchRequiredSkills]);

  const addRequiredSkill = async (skill: Omit<RequiredSkill, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in");

      const { error } = await supabase.from('client_required_skills').insert([{
        client_id: clientId,
        user_id: user.id,
        skill_name: skill.skill_name,
        priority: skill.priority,
        minimum_proficiency: skill.minimum_proficiency,
        requires_certification: skill.requires_certification,
        notes: skill.notes,
      }]);

      if (error) throw error;
      
      toast({ title: "Required skill added!" });
      fetchRequiredSkills();
      return true;
    } catch (error: any) {
      toast({
        title: "Error adding required skill",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const removeRequiredSkill = async (skillId: string) => {
    try {
      const { error } = await supabase
        .from('client_required_skills')
        .delete()
        .eq('id', skillId);

      if (error) throw error;
      
      toast({ title: "Required skill removed!" });
      fetchRequiredSkills();
      return true;
    } catch (error: any) {
      toast({
        title: "Error removing skill",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    requiredSkills,
    loading,
    addRequiredSkill,
    removeRequiredSkill,
    refetch: fetchRequiredSkills,
  };
}

export function useSkillMatching(clientId: string) {
  const { toast } = useToast();
  const [matchedCaregivers, setMatchedCaregivers] = useState<MatchedCaregiver[]>([]);
  const [loading, setLoading] = useState(false);

  const findMatchingCaregivers = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch client required skills
      const { data: requiredSkills, error: skillsError } = await supabase
        .from('client_required_skills')
        .select('*')
        .eq('client_id', clientId);

      if (skillsError) throw skillsError;

      if (!requiredSkills || requiredSkills.length === 0) {
        setMatchedCaregivers([]);
        return;
      }

      // Fetch all active caregivers with their skills
      const { data: caregivers, error: caregiversError } = await supabase
        .from('caregivers')
        .select('*')
        .eq('status', 'active');

      if (caregiversError) throw caregiversError;

      if (!caregivers || caregivers.length === 0) {
        setMatchedCaregivers([]);
        return;
      }

      // Fetch all caregiver skills
      const caregiverIds = caregivers.map(c => c.id);
      const { data: allSkills, error: allSkillsError } = await supabase
        .from('caregiver_skills')
        .select('*')
        .in('caregiver_id', caregiverIds);

      if (allSkillsError) throw allSkillsError;

      // Group skills by caregiver
      const skillsByCaregiver: Record<string, CaregiverSkill[]> = {};
      (allSkills || []).forEach(skill => {
        if (!skillsByCaregiver[skill.caregiver_id]) {
          skillsByCaregiver[skill.caregiver_id] = [];
        }
        skillsByCaregiver[skill.caregiver_id].push({
          skill_name: skill.skill_name,
          proficiency_level: skill.proficiency_level,
          is_certified: skill.is_certified,
          years_experience: skill.years_experience,
        });
      });

      // Calculate match scores for each caregiver
      const matches: MatchedCaregiver[] = caregivers.map(caregiver => {
        const caregiverSkills = skillsByCaregiver[caregiver.id] || [];
        const matchedSkills: string[] = [];
        const missingSkills: string[] = [];
        const partialMatches: string[] = [];
        let totalScore = 0;
        let maxPossibleScore = 0;

        requiredSkills.forEach(required => {
          const priorityWeight = required.priority === 'required' ? 3 : 
                                 required.priority === 'preferred' ? 2 : 1;
          maxPossibleScore += priorityWeight * 10;

          const caregiverSkill = caregiverSkills.find(
            s => s.skill_name.toLowerCase() === required.skill_name.toLowerCase()
          );

          if (!caregiverSkill) {
            if (required.priority === 'required') {
              missingSkills.push(required.skill_name);
            }
            return;
          }

          // Check proficiency level
          const requiredLevel = PROFICIENCY_LEVELS[required.minimum_proficiency || 'intermediate'] || 2;
          const caregiverLevel = PROFICIENCY_LEVELS[caregiverSkill.proficiency_level] || 2;

          if (caregiverLevel >= requiredLevel) {
            // Check certification requirement
            if (required.requires_certification && !caregiverSkill.is_certified) {
              partialMatches.push(`${required.skill_name} (needs certification)`);
              totalScore += priorityWeight * 5; // Half points for missing cert
            } else {
              matchedSkills.push(required.skill_name);
              totalScore += priorityWeight * 10;
              // Bonus for exceeding proficiency
              if (caregiverLevel > requiredLevel) {
                totalScore += (caregiverLevel - requiredLevel) * priorityWeight;
              }
            }
          } else {
            partialMatches.push(`${required.skill_name} (${caregiverSkill.proficiency_level})`);
            totalScore += priorityWeight * 3; // Partial points for lower proficiency
          }
        });

        const matchScore = maxPossibleScore > 0 
          ? Math.round((totalScore / maxPossibleScore) * 100) 
          : 0;

        return {
          id: caregiver.id,
          first_name: caregiver.first_name,
          last_name: caregiver.last_name,
          email: caregiver.email,
          phone: caregiver.phone,
          status: caregiver.status,
          hourly_rate: caregiver.hourly_rate,
          skills: caregiverSkills,
          matchScore,
          matchedSkills,
          missingSkills,
          partialMatches,
        };
      });

      // Sort by match score (highest first) and filter out zero matches
      const sortedMatches = matches
        .filter(m => m.matchScore > 0 || m.matchedSkills.length > 0)
        .sort((a, b) => b.matchScore - a.matchScore);

      setMatchedCaregivers(sortedMatches);
    } catch (error: any) {
      toast({
        title: "Error finding matches",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [clientId, toast]);

  useEffect(() => {
    findMatchingCaregivers();
  }, [findMatchingCaregivers]);

  return {
    matchedCaregivers,
    loading,
    refetch: findMatchingCaregivers,
  };
}
