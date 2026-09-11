SELECT cron.schedule(
  'nurse-assessment-scheduler-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://iljmedelpqwzwyecvksa.supabase.co/functions/v1/nurse-assessment-scheduler',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);