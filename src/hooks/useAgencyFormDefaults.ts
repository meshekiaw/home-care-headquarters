import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AgencyFormDefaults = {
  id: string;
  provider_name: string;
  provider_id_number: string;
  mailing_address: string;
  referral_source: string;
  projected_end_date_of_service: string;
  attending_physician: string;
  attending_physician_provider_id: string;
  section_xi_certification: string;
  section_xi_comments: string;
};

export const AGENCY_DEFAULT_FIELD_LABELS: Record<keyof Omit<AgencyFormDefaults, "id">, string> = {
  provider_name: "Personal Care Provider Name",
  provider_id_number: "Provider ID Number",
  mailing_address: "Mailing Address",
  referral_source: "Referral Source",
  projected_end_date_of_service: "Projected End Date of Service",
  attending_physician: "Attending Physician",
  attending_physician_provider_id: "Attending Physician's Provider ID Number/Taxonomy Code",
  section_xi_certification: "Section XI — I certify that personal care services are required to",
  section_xi_comments: "Section XI — Additional comments",
};

export function useAgencyFormDefaults() {
  const [defaults, setDefaults] = useState<AgencyFormDefaults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("agency_form_defaults")
      .select(
        "id, provider_name, provider_id_number, mailing_address, referral_source, projected_end_date_of_service, attending_physician, attending_physician_provider_id, section_xi_certification, section_xi_comments",
      )
      .limit(1)
      .maybeSingle();

    if (err) setError(err.message);
    else setDefaults((data as AgencyFormDefaults) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { defaults, loading, error, reload: load };
}
