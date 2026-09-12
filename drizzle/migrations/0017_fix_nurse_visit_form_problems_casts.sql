CREATE OR REPLACE FUNCTION public.nurse_visit_form_problems(p_form_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d jsonb;
  problems text[] := ARRAY[]::text[];
  yn text;
  has_no boolean := false;
  hosp jsonb;
  row_item jsonb;
  mobility jsonb;
BEGIN
  SELECT form_data INTO d FROM public.nurse_visit_forms WHERE id = p_form_id;
  IF d IS NULL THEN
    RETURN ARRAY['The form could not be found.']::text[];
  END IF;

  IF btrim(COALESCE(d->>'client_name', '')) = '' THEN
    problems := problems || 'Client name is required.'::text;
  END IF;
  IF btrim(COALESCE(d->>'visit_date', '')) = '' THEN
    problems := problems || 'Date is required.'::text;
  END IF;
  IF btrim(COALESCE(d->>'caregiver_name', '')) = '' THEN
    problems := problems || 'Caregiver name is required.'::text;
  END IF;
  IF COALESCE(d->>'caregiver_present', '') NOT IN ('Yes', 'No') THEN
    problems := problems || 'Caregiver present must be answered Yes or No.'::text;
  END IF;

  IF COALESCE(jsonb_array_length(COALESCE(d->'service_types', '[]'::jsonb)), 0) = 0 THEN
    problems := problems || 'At least one type of service must be checked.'::text;
  END IF;

  mobility := COALESCE(d->'mobility', '[]'::jsonb);
  IF COALESCE(jsonb_array_length(mobility), 0) = 0 THEN
    problems := problems || 'At least one mobility level must be checked.'::text;
  END IF;
  IF mobility ? 'walks_with_device'
     AND COALESCE(jsonb_array_length(COALESCE(d->'mobility_devices', '[]'::jsonb)), 0) = 0 THEN
    problems := problems || 'Select which device the client walks with.'::text;
  END IF;

  FOR yn IN SELECT unnest(ARRAY['pleased_with_care', 'follows_service_plan', 'conduct_and_schedule']) LOOP
    IF COALESCE(d->'client_responses'->>yn, '') NOT IN ('Yes', 'No', 'N/A') THEN
      problems := problems || 'Every client response to service must be answered.'::text;
      EXIT;
    END IF;
  END LOOP;

  FOR yn IN SELECT unnest(ARRAY['performs_tasks', 'relates_well', 'caring_and_sympathetic']) LOOP
    IF COALESCE(d->'caregiver_performance'->>yn, '') NOT IN ('Yes', 'No', 'N/A') THEN
      problems := problems || 'Every caregiver performance item must be answered.'::text;
      EXIT;
    END IF;
  END LOOP;

  IF COALESCE(d->>'hospitalized', '') NOT IN ('Yes', 'No') THEN
    problems := problems || 'Answer whether the client has been hospitalized since the previous supervisory visit.'::text;
  ELSIF d->>'hospitalized' = 'Yes' THEN
    hosp := COALESCE(d->'hospitalizations', '[]'::jsonb);
    IF COALESCE(jsonb_array_length(hosp), 0) = 0 THEN
      problems := problems || 'Add at least one hospitalization with the admit and discharge details.'::text;
    ELSE
      FOR row_item IN SELECT jsonb_array_elements(hosp) LOOP
        IF btrim(COALESCE(row_item->>'admit_date', '')) = ''
           OR btrim(COALESCE(row_item->>'admit_time', '')) = ''
           OR btrim(COALESCE(row_item->>'hospital', '')) = ''
           OR btrim(COALESCE(row_item->>'discharge_date', '')) = ''
           OR btrim(COALESCE(row_item->>'discharge_time', '')) = '' THEN
          problems := problems || 'Each hospitalization needs an admit date and time, hospital, and discharge date and time.'::text;
          EXIT;
        END IF;
      END LOOP;
    END IF;
  END IF;

  FOR yn IN SELECT unnest(ARRAY['plan_adequate', 'needs_changes', 'needs_copy']) LOOP
    IF COALESCE(d->'service_plan'->>yn, '') NOT IN ('Yes', 'No') THEN
      problems := problems || 'Every service plan question must be answered Yes or No.'::text;
      EXIT;
    END IF;
  END LOOP;

  IF btrim(COALESCE(d->>'comments', '')) = '' THEN
    problems := problems || 'Assistive devices / comments / further instructions is required.'::text;
  END IF;

  SELECT bool_or(v = 'No') INTO has_no FROM (
    SELECT value AS v FROM jsonb_each_text(COALESCE(d->'client_responses', '{}'::jsonb))
    UNION ALL
    SELECT value AS v FROM jsonb_each_text(COALESCE(d->'caregiver_performance', '{}'::jsonb))
    UNION ALL
    SELECT value AS v FROM jsonb_each_text(COALESCE(d->'service_plan', '{}'::jsonb))
    UNION ALL
    SELECT COALESCE(d->>'caregiver_present', '') AS v
  ) answers;

  IF COALESCE(has_no, false) AND length(btrim(COALESCE(d->>'comments', ''))) < 10 THEN
    problems := problems ||
      'A "No" answer was recorded, so it must be documented in the comments before the form can be completed.'::text;
  END IF;

  RETURN problems;
END;
$$;

GRANT EXECUTE ON FUNCTION public.nurse_visit_form_problems(uuid) TO authenticated;
