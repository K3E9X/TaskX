DO $$
BEGIN
  PERFORM cron.unschedule('ingest-feeds-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('ingest-feeds-10h');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('ingest-feeds-15h');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('ingest-feeds-18h');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'ingest-feeds-every-30-min',
  '*/30 * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://project--ea34970b-7b98-4c6d-9d86-02f059f8f526.lovable.app/api/public/hooks/ingest-feeds',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_hook_secret' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $job$
);

SELECT cron.schedule(
  'ingest-feeds-10h',
  '0 10 * * *',
  $job$
  SELECT net.http_post(
    url := 'https://project--ea34970b-7b98-4c6d-9d86-02f059f8f526.lovable.app/api/public/hooks/ingest-feeds',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_hook_secret' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $job$
);

SELECT cron.schedule(
  'ingest-feeds-15h',
  '0 15 * * *',
  $job$
  SELECT net.http_post(
    url := 'https://project--ea34970b-7b98-4c6d-9d86-02f059f8f526.lovable.app/api/public/hooks/ingest-feeds',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_hook_secret' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $job$
);

SELECT cron.schedule(
  'ingest-feeds-18h',
  '0 18 * * *',
  $job$
  SELECT net.http_post(
    url := 'https://project--ea34970b-7b98-4c6d-9d86-02f059f8f526.lovable.app/api/public/hooks/ingest-feeds',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_hook_secret' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $job$
);

DO $$
BEGIN
  PERFORM cron.unschedule('purge-feed-items-7d');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'purge-feed-items-7d',
  '0 3 * * *',
  $$DELETE FROM public.feed_items WHERE published_at < now() - interval '7 days';$$
);