
-- 1) Drop admin email columns from sensitive tables
ALTER TABLE public.admin_actions DROP COLUMN IF EXISTS actor_email;
ALTER TABLE public.admin_actions DROP COLUMN IF EXISTS target_email;
ALTER TABLE public.admin_user_notes DROP COLUMN IF EXISTS author_email;
ALTER TABLE public.blocked_ips DROP COLUMN IF EXISTS blocked_by_email;

-- 2) Tighten admin_announcements: only admins can SELECT directly.
-- Active announcements for non-admins are served via a server fn (supabaseAdmin).
DROP POLICY IF EXISTS announcements_select_authenticated ON public.admin_announcements;

-- 3) Revoke has_role from anon (no anon-readable table relies on it)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
