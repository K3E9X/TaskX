SELECT cron.unschedule('monthly-linux-tip');
SELECT cron.schedule(
  'daily-linux-tip',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url:='https://project--ea34970b-7b98-4c6d-9d86-02f059f8f526.lovable.app/api/public/hooks/monthly-tip',
    headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNib2tnbmRiYWpicGxtdHd5d2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzAyMTksImV4cCI6MjA5NTA0NjIxOX0.fE7MNRTcGcxgTpMEEiZm1aDcPrpeVqTzqE7hwrqpCI0"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);