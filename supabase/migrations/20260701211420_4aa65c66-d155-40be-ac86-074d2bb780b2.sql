
SELECT cron.schedule(
  'refresh-nuclei-index-daily',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--ea34970b-7b98-4c6d-9d86-02f059f8f526.lovable.app/api/public/hooks/refresh-nuclei-index',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-hook-secret', public.get_cron_hook_secret()
    ),
    body := '{}'::jsonb
  );
  $$
);
