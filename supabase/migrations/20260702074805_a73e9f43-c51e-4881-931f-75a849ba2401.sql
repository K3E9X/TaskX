DO $$ BEGIN
  PERFORM cron.unschedule('purge-feed-items-7d');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM cron.unschedule('purge-feed-items-14d');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'purge-feed-items-14d',
  '15 3 * * *',
  $$DELETE FROM public.feed_items WHERE published_at < now() - interval '14 days';$$
);
DELETE FROM public.feed_items WHERE published_at < now() - interval '14 days';