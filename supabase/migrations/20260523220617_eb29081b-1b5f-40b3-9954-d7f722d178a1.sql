-- 1. Create a vault secret for cron hook auth (random per project)
DO $$
DECLARE
  existing uuid;
BEGIN
  SELECT id INTO existing FROM vault.secrets WHERE name = 'cron_hook_secret' LIMIT 1;
  IF existing IS NULL THEN
    PERFORM vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'cron_hook_secret',
      'Shared secret authenticating pg_cron → /api/public/hooks/* calls'
    );
  END IF;
END $$;

-- 2. SECURITY DEFINER helper, callable only by service_role
CREATE OR REPLACE FUNCTION public.get_cron_hook_secret()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_hook_secret' LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_cron_hook_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_hook_secret() TO service_role;

-- 3. Reschedule cron jobs to use the new secret (read inline from vault)
DO $$ BEGIN PERFORM cron.unschedule('ingest-feeds-hourly'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('monthly-tip-1st'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'ingest-feeds-hourly',
  '0 * * * *',
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
  'monthly-tip-1st',
  '0 8 1 * *',
  $job$
  SELECT net.http_post(
    url := 'https://project--ea34970b-7b98-4c6d-9d86-02f059f8f526.lovable.app/api/public/hooks/monthly-tip',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_hook_secret' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $job$
);