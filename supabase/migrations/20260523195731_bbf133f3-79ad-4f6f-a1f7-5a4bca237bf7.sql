-- Notes admin par user (privées, visibles seulement par admins)
CREATE TABLE public.admin_user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  author_id uuid NOT NULL,
  author_email text,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_user_notes_target ON public.admin_user_notes(target_user_id, created_at DESC);
ALTER TABLE public.admin_user_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_user_notes_admin_all" ON public.admin_user_notes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- IPs bloquées
CREATE TABLE public.blocked_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL UNIQUE,
  reason text,
  blocked_by uuid NOT NULL,
  blocked_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_blocked_ips_ip ON public.blocked_ips(ip);
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocked_ips_admin_all" ON public.blocked_ips
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enrichissement page_views: browser, os, country
ALTER TABLE public.page_views
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS os text,
  ADD COLUMN IF NOT EXISTS country text;

CREATE INDEX IF NOT EXISTS idx_page_views_country ON public.page_views(country) WHERE country IS NOT NULL;