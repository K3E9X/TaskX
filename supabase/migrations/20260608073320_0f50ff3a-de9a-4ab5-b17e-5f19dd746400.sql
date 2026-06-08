
-- 1. Revoke EXECUTE from anon/public on SECURITY DEFINER helpers not meant for unauthenticated use
REVOKE EXECUTE ON FUNCTION public.get_current_streak() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_cron_hook_secret() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_cron_recent_runs() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_engagement_stats() FROM anon, public;

-- 2. Pin search_path on functions that were missing it
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;

-- 3. Add missing DELETE policy on daily_activity (owner-scoped)
CREATE POLICY "Users can delete their own daily activity"
  ON public.daily_activity
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
