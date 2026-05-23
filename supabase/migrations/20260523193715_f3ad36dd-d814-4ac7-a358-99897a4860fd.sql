-- =========================================
-- 1. AUDIT LOG (admin_actions)
-- =========================================
CREATE TABLE public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  actor_email text,
  action text NOT NULL,
  target_type text,
  target_id text,
  target_email text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_actions_created_at ON public.admin_actions(created_at DESC);
CREATE INDEX idx_admin_actions_actor ON public.admin_actions(actor_id);
CREATE INDEX idx_admin_actions_target ON public.admin_actions(target_id);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_actions_select_admin ON public.admin_actions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Inserts only via service role (server functions), no client insert policy needed.

-- =========================================
-- 2. FEATURE FLAGS
-- =========================================
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  user_id uuid, -- null = global flag
  enabled boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key, user_id)
);
CREATE INDEX idx_feature_flags_key ON public.feature_flags(key);
CREATE INDEX idx_feature_flags_user ON public.feature_flags(user_id);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY feature_flags_admin_all ON public.feature_flags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Users: read flags that apply to them (their own or global)
CREATE POLICY feature_flags_select_self ON public.feature_flags
  FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE TRIGGER trg_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- 3. PAGE VIEWS (tracking)
-- =========================================
CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  path text NOT NULL,
  referrer text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_page_views_user ON public.page_views(user_id);
CREATE INDEX idx_page_views_created_at ON public.page_views(created_at DESC);
CREATE INDEX idx_page_views_path ON public.page_views(path);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY page_views_insert_self ON public.page_views
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY page_views_select_admin ON public.page_views
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY page_views_select_self ON public.page_views
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- =========================================
-- 4. RPC: get_engagement_stats (DAU / WAU / MAU + top paths)
-- =========================================
CREATE OR REPLACE FUNCTION public.get_engagement_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  dau int;
  wau int;
  mau int;
  total_views int;
  top_paths jsonb;
  views_per_day jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  SELECT COUNT(DISTINCT user_id) INTO dau
    FROM public.page_views WHERE created_at >= now() - interval '1 day';
  SELECT COUNT(DISTINCT user_id) INTO wau
    FROM public.page_views WHERE created_at >= now() - interval '7 days';
  SELECT COUNT(DISTINCT user_id) INTO mau
    FROM public.page_views WHERE created_at >= now() - interval '30 days';
  SELECT COUNT(*) INTO total_views
    FROM public.page_views WHERE created_at >= now() - interval '30 days';

  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO top_paths
    FROM (
      SELECT path, COUNT(*) AS views, COUNT(DISTINCT user_id) AS uniques
      FROM public.page_views
      WHERE created_at >= now() - interval '30 days'
      GROUP BY path
      ORDER BY views DESC
      LIMIT 20
    ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.day), '[]'::jsonb) INTO views_per_day
    FROM (
      SELECT to_char(date_trunc('day', created_at), 'MM-DD') AS day,
             COUNT(*) AS views,
             COUNT(DISTINCT user_id) AS uniques
      FROM public.page_views
      WHERE created_at >= now() - interval '30 days'
      GROUP BY 1
    ) t;

  result := jsonb_build_object(
    'dau', dau, 'wau', wau, 'mau', mau,
    'total_views_30d', total_views,
    'top_paths', top_paths,
    'views_per_day', views_per_day
  );
  RETURN result;
END;
$$;