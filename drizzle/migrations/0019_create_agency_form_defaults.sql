CREATE TABLE public.agency_form_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  provider_name text NOT NULL DEFAULT 'Home Care Network LLC',
  provider_id_number text NOT NULL DEFAULT '236596732',
  mailing_address text NOT NULL DEFAULT '2607 W. 28th St. Pine Bluff, AR 71603',
  referral_source text NOT NULL DEFAULT 'Home Care Network',
  projected_end_date_of_service text NOT NULL DEFAULT 'N/A',
  attending_physician text NOT NULL DEFAULT 'N/A',
  attending_physician_provider_id text NOT NULL DEFAULT 'N/A',
  section_xi_certification text NOT NULL DEFAULT 'improve quality of life and safety in activities of daily living.',
  section_xi_comments text NOT NULL DEFAULT 'Hours and days may vary due to schedule conflicts.',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT agency_form_defaults_singleton_unique UNIQUE (singleton)
);

GRANT SELECT, INSERT, UPDATE ON public.agency_form_defaults TO authenticated;
GRANT ALL ON public.agency_form_defaults TO service_role;

ALTER TABLE public.agency_form_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read agency form defaults"
ON public.agency_form_defaults FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert agency form defaults"
ON public.agency_form_defaults FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update agency form defaults"
ON public.agency_form_defaults FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.agency_form_defaults (singleton) VALUES (true);