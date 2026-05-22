-- 1. RSS sources table
CREATE TABLE public.rss_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  source_type public.feed_source NOT NULL DEFAULT 'rss',
  default_severity public.feed_severity NOT NULL DEFAULT 'info',
  enabled boolean NOT NULL DEFAULT true,
  last_fetched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, url)
);

ALTER TABLE public.rss_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY rss_sources_select_own ON public.rss_sources FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY rss_sources_insert_own ON public.rss_sources FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY rss_sources_update_own ON public.rss_sources FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY rss_sources_delete_own ON public.rss_sources FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER rss_sources_updated_at BEFORE UPDATE ON public.rss_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Auto-tip flag on profiles
ALTER TABLE public.profiles ADD COLUMN auto_tip_enabled boolean NOT NULL DEFAULT true;

-- 3. is_auto flag on feed_items
ALTER TABLE public.feed_items ADD COLUMN is_auto boolean NOT NULL DEFAULT false;

-- Index for dedup
CREATE INDEX idx_feed_items_user_url ON public.feed_items (user_id, url);
CREATE INDEX idx_feed_items_user_ext ON public.feed_items (user_id, external_id);

-- 4. Seed default sources for existing users
INSERT INTO public.rss_sources (user_id, name, url, source_type, default_severity)
SELECT p.id, s.name, s.url, s.source_type::public.feed_source, s.default_severity::public.feed_severity
FROM public.profiles p
CROSS JOIN (VALUES
  ('The Hacker News', 'https://feeds.feedburner.com/TheHackersNews', 'cti', 'medium'),
  ('BleepingComputer', 'https://www.bleepingcomputer.com/feed/', 'cti', 'medium'),
  ('CISA KEV', 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', 'cve', 'high'),
  ('NVD Recent CVEs', 'https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=20', 'cve', 'medium')
) AS s(name, url, source_type, default_severity)
ON CONFLICT (user_id, url) DO NOTHING;

-- 5. Auto-seed for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, display_name, team_role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'team_role')::public.team_role, 'architect')
  );
  insert into public.user_roles (user_id, role)
  values (new.id, 'member');

  insert into public.rss_sources (user_id, name, url, source_type, default_severity) values
    (new.id, 'The Hacker News', 'https://feeds.feedburner.com/TheHackersNews', 'cti', 'medium'),
    (new.id, 'BleepingComputer', 'https://www.bleepingcomputer.com/feed/', 'cti', 'medium'),
    (new.id, 'CISA KEV', 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', 'cve', 'high'),
    (new.id, 'NVD Recent CVEs', 'https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=20', 'cve', 'medium');

  return new;
end;
$function$;