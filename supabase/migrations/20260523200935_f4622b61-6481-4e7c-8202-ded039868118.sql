CREATE TABLE public.admin_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('info','warning','critical')),
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  author_id uuid NOT NULL,
  author_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_select_authenticated"
ON public.admin_announcements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "announcements_admin_all"
ON public.admin_announcements FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER announcements_set_updated_at
BEFORE UPDATE ON public.admin_announcements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_announcements_active ON public.admin_announcements (active, expires_at);