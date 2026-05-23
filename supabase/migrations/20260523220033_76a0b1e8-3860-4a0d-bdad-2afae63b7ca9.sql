-- 1. Fix search_path on email queue functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;

-- 2. Revoke EXECUTE from anon/authenticated on internal-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_engagement_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_cron_recent_runs() FROM PUBLIC, anon, authenticated;

-- 3. Drop sensitive author_email column from admin_announcements
ALTER TABLE public.admin_announcements DROP COLUMN IF EXISTS author_email;

-- 4. Add INSERT policy for admin_actions (admins only; service role bypasses RLS)
DROP POLICY IF EXISTS admin_actions_insert_admin ON public.admin_actions;
CREATE POLICY admin_actions_insert_admin
  ON public.admin_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Tighten contact_submissions INSERT policy
DROP POLICY IF EXISTS "Anyone can submit contact" ON public.contact_submissions;
CREATE POLICY contact_submissions_public_insert
  ON public.contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(name) BETWEEN 1 AND 200
    AND char_length(email) BETWEEN 3 AND 320
    AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(subject) BETWEEN 1 AND 300
    AND char_length(message) BETWEEN 1 AND 10000
  );