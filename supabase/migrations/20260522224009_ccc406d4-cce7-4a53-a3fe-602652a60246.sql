CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove if exists, then schedule
DO $$ BEGIN PERFORM cron.unschedule('ingest-feeds-hourly'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('monthly-tip-1st'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'ingest-feeds-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--ea34970b-7b98-4c6d-9d86-02f059f8f526.lovable.app/api/public/hooks/ingest-feeds',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNib2tnbmRiYWpicGxtdHd5d2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzAyMTksImV4cCI6MjA5NTA0NjIxOX0.fE7MNRTcGcxgTpMEEiZm1aDcPrpeVqTzqE7hwrqpCI0"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'monthly-tip-1st',
  '0 8 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://project--ea34970b-7b98-4c6d-9d86-02f059f8f526.lovable.app/api/public/hooks/monthly-tip',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNib2tnbmRiYWpicGxtdHd5d2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzAyMTksImV4cCI6MjA5NTA0NjIxOX0.fE7MNRTcGcxgTpMEEiZm1aDcPrpeVqTzqE7hwrqpCI0"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);