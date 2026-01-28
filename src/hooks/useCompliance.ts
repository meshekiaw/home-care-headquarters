import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addDays, isPast, isBefore, isAfter, differenceInDays } from "date-fns";

interface CaregiverCredential {
  id: string;
  caregiver_id: string;
  credential_name: string;
  credential_type: string;
  credential_number: string | null;
  issuing_organization: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  status: string;
  document_url: string | null;
  caregiver: {
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    status: string;
  };
}

interface ComplianceStats {
  totalCredentials: number;
  validCredentials: number;
  expiringCredentials: number;
  expiredCredentials: number;
  totalCaregivers: number;
  compliantCaregivers: number;
  nonCompliantCaregivers: number;
}

interface RequiredTraining {
  name: string;
  description: string;
  requiredForAll: boolean;
}

const REQUIRED_TRAININGS: RequiredTraining[] = [
  { name: "CPR", description: "CPR Certification", requiredForAll: true },
  { name: "First Aid", description: "First Aid Certification", requiredForAll: true },
  { name: "HIPAA Training", description: "HIPAA Compliance Training", requiredForAll: true },
  { name: "Infection Control", description: "Infection Control Training", requiredForAll: true },
  { name: "Patient Rights", description: "Patient Rights Training", requiredForAll: true },
  { name: "Abuse Prevention", description: "Abuse Prevention Training", requiredForAll: true },
];

export function useComplianceDashboard() {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<CaregiverCredential[]>([]);
  const [stats, setStats] = useState<ComplianceStats>({
    totalCredentials: 0,
    validCredentials: 0,
    expiringCredentials: 0,
    expiredCredentials: 0,
    totalCaregivers: 0,
    compliantCaregivers: 0,
    nonCompliantCaregivers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [expiringDaysFilter, setExpiringDaysFilter] = useState(30);

  const fetchComplianceData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all credentials with caregiver info
      const { data: credentialsData, error: credentialsError } = await supabase
        .from('caregiver_credentials')
        .select(`
          id,
          caregiver_id,
          credential_name,
          credential_type,
          credential_number,
          issuing_organization,
          issue_date,
          expiry_date,
          status,
          document_url,
          caregivers (
            first_name,
            last_name,
            email,
            phone,
            status
          )
        `)
        .order('expiry_date', { ascending: true });

      if (credentialsError) throw credentialsError;

      // Fetch all caregivers for compliance calculation
      const { data: caregiversData, error: caregiversError } = await supabase
        .from('caregivers')
        .select('id, first_name, last_name, status')
        .eq('status', 'active');

      if (caregiversError) throw caregiversError;

      const today = new Date();
      const expiringThreshold = addDays(today, expiringDaysFilter);

      // Process credentials
      const processedCredentials: CaregiverCredential[] = (credentialsData || []).map((cred: any) => ({
        ...cred,
        caregiver: cred.caregivers,
      }));

      // Calculate stats
      let validCount = 0;
      let expiringCount = 0;
      let expiredCount = 0;

      const caregiverCredentialStatus: Record<string, { hasExpired: boolean; hasExpiring: boolean }> = {};

      processedCredentials.forEach((cred) => {
        if (!caregiverCredentialStatus[cred.caregiver_id]) {
          caregiverCredentialStatus[cred.caregiver_id] = { hasExpired: false, hasExpiring: false };
        }

        if (cred.expiry_date) {
          const expiryDate = new Date(cred.expiry_date);
          
          if (isPast(expiryDate)) {
            expiredCount++;
            caregiverCredentialStatus[cred.caregiver_id].hasExpired = true;
          } else if (isBefore(expiryDate, expiringThreshold)) {
            expiringCount++;
            caregiverCredentialStatus[cred.caregiver_id].hasExpiring = true;
          } else {
            validCount++;
          }
        } else {
          validCount++;
        }
      });

      // Calculate caregiver compliance
      const activeCaregiverIds = (caregiversData || []).map(c => c.id);
      let compliantCount = 0;
      let nonCompliantCount = 0;

      activeCaregiverIds.forEach((id) => {
        const status = caregiverCredentialStatus[id];
        if (status?.hasExpired) {
          nonCompliantCount++;
        } else {
          compliantCount++;
        }
      });

      setCredentials(processedCredentials);
      setStats({
        totalCredentials: processedCredentials.length,
        validCredentials: validCount,
        expiringCredentials: expiringCount,
        expiredCredentials: expiredCount,
        totalCaregivers: activeCaregiverIds.length,
        compliantCaregivers: compliantCount,
        nonCompliantCaregivers: nonCompliantCount,
      });
    } catch (error: any) {
      toast({
        title: "Error loading compliance data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [expiringDaysFilter, toast]);

  useEffect(() => {
    fetchComplianceData();
  }, [fetchComplianceData]);

  const getCredentialStatus = (expiryDate: string | null): 'valid' | 'expiring' | 'expired' => {
    if (!expiryDate) return 'valid';
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const expiringThreshold = addDays(today, expiringDaysFilter);

    if (isPast(expiry)) return 'expired';
    if (isBefore(expiry, expiringThreshold)) return 'expiring';
    return 'valid';
  };

  const getDaysUntilExpiry = (expiryDate: string | null): number | null => {
    if (!expiryDate) return null;
    return differenceInDays(new Date(expiryDate), new Date());
  };

  const getExpiredCredentials = () => 
    credentials.filter(c => getCredentialStatus(c.expiry_date) === 'expired');

  const getExpiringCredentials = () => 
    credentials.filter(c => getCredentialStatus(c.expiry_date) === 'expiring');

  const getValidCredentials = () => 
    credentials.filter(c => getCredentialStatus(c.expiry_date) === 'valid');

  return {
    credentials,
    stats,
    loading,
    expiringDaysFilter,
    setExpiringDaysFilter,
    getCredentialStatus,
    getDaysUntilExpiry,
    getExpiredCredentials,
    getExpiringCredentials,
    getValidCredentials,
    requiredTrainings: REQUIRED_TRAININGS,
    refetch: fetchComplianceData,
  };
}

export function useTrainingCompliance() {
  const { toast } = useToast();
  const [trainingStatus, setTrainingStatus] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);

  const fetchTrainingStatus = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all active caregivers
      const { data: caregivers, error: caregiversError } = await supabase
        .from('caregivers')
        .select('id, first_name, last_name')
        .eq('status', 'active');

      if (caregiversError) throw caregiversError;

      // Fetch all credentials that are training-related
      const { data: credentials, error: credentialsError } = await supabase
        .from('caregiver_credentials')
        .select('caregiver_id, credential_name, expiry_date')
        .eq('credential_type', 'training');

      if (credentialsError) throw credentialsError;

      // Build status map
      const statusMap: Record<string, Record<string, boolean>> = {};
      const today = new Date();

      (caregivers || []).forEach((caregiver) => {
        statusMap[caregiver.id] = {};
        
        REQUIRED_TRAININGS.forEach((training) => {
          const caregiverTrainings = (credentials || []).filter(
            c => c.caregiver_id === caregiver.id && 
                 c.credential_name.toLowerCase().includes(training.name.toLowerCase())
          );
          
          const hasValidTraining = caregiverTrainings.some(t => {
            if (!t.expiry_date) return true;
            return isAfter(new Date(t.expiry_date), today);
          });
          
          statusMap[caregiver.id][training.name] = hasValidTraining;
        });
      });

      setTrainingStatus(statusMap);
    } catch (error: any) {
      toast({
        title: "Error loading training data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTrainingStatus();
  }, [fetchTrainingStatus]);

  return {
    trainingStatus,
    loading,
    refetch: fetchTrainingStatus,
  };
}
