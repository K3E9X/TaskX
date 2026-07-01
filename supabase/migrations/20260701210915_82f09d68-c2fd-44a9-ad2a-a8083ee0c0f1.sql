
ALTER TABLE public.feed_items
  ADD COLUMN IF NOT EXISTS cve_id text,
  ADD COLUMN IF NOT EXISTS epss_score numeric,
  ADD COLUMN IF NOT EXISTS epss_percentile numeric,
  ADD COLUMN IF NOT EXISTS is_kev boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_poc boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS poc_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS affected_cpes text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_feed_items_cve_id ON public.feed_items(cve_id);
CREATE INDEX IF NOT EXISTS idx_feed_items_is_kev ON public.feed_items(is_kev) WHERE is_kev = true;
CREATE INDEX IF NOT EXISTS idx_feed_items_epss ON public.feed_items(epss_percentile DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_feed_items_cpes ON public.feed_items USING GIN(affected_cpes);

CREATE TABLE IF NOT EXISTS public.user_stack_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor text NOT NULL,
  product text NOT NULL,
  version text,
  cpe_prefix text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_stack_items TO authenticated;
GRANT ALL ON public.user_stack_items TO service_role;
ALTER TABLE public.user_stack_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "own stack select" ON public.user_stack_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "own stack insert" ON public.user_stack_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "own stack update" ON public.user_stack_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "own stack delete" ON public.user_stack_items FOR DELETE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_user_stack_user ON public.user_stack_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stack_cpe ON public.user_stack_items(cpe_prefix);

CREATE TABLE IF NOT EXISTS public.nuclei_cve_index (
  cve_id text PRIMARY KEY,
  added_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nuclei_cve_index TO authenticated, anon;
GRANT ALL ON public.nuclei_cve_index TO service_role;
ALTER TABLE public.nuclei_cve_index ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "nuclei public read" ON public.nuclei_cve_index FOR SELECT TO authenticated, anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, display_name, first_name, last_name, onboarded, dashboard_widgets)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    false, '{}'::text[]);
  insert into public.user_roles (user_id, role) values (new.id, 'member');
  insert into public.rss_sources (user_id, name, url, source_type, default_severity) values
    (new.id, 'The Hacker News', 'https://feeds.feedburner.com/TheHackersNews', 'cti', 'medium'),
    (new.id, 'BleepingComputer', 'https://www.bleepingcomputer.com/feed/', 'cti', 'medium'),
    (new.id, 'CISA KEV', 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', 'cve', 'high'),
    (new.id, 'NVD Recent CVEs', 'https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=20', 'cve', 'medium'),
    (new.id, 'CERT-FR Avis', 'https://www.cert.ssi.gouv.fr/avis/feed/', 'cti', 'high'),
    (new.id, 'CERT-FR Alertes', 'https://www.cert.ssi.gouv.fr/alerte/feed/', 'cti', 'critical'),
    (new.id, 'CERT-EU Threat Intel', 'https://cert.europa.eu/publications/threat-intelligence/rss', 'cti', 'medium');
  return new;
end;
$function$;

INSERT INTO public.rss_sources (user_id, name, url, source_type, default_severity)
SELECT p.id, s.name, s.url, s.source_type::feed_source, s.default_severity::feed_severity
FROM public.profiles p
CROSS JOIN (VALUES
  ('CERT-FR Avis',        'https://www.cert.ssi.gouv.fr/avis/feed/',                         'cti', 'high'),
  ('CERT-FR Alertes',     'https://www.cert.ssi.gouv.fr/alerte/feed/',                       'cti', 'critical'),
  ('CERT-EU Threat Intel','https://cert.europa.eu/publications/threat-intelligence/rss',     'cti', 'medium')
) AS s(name, url, source_type, default_severity)
WHERE NOT EXISTS (SELECT 1 FROM public.rss_sources rs WHERE rs.user_id = p.id AND rs.url = s.url);

UPDATE public.feed_items
SET cve_id = upper(substring(coalesce(title,'') || ' ' || coalesce(external_id,'') FROM 'CVE-[0-9]{4}-[0-9]{4,}'))
WHERE cve_id IS NULL
  AND (title ~* 'CVE-[0-9]{4}-[0-9]{4,}' OR external_id ~* 'CVE-[0-9]{4}-[0-9]{4,}');

UPDATE public.feed_items SET is_kev = true
WHERE is_kev = false AND 'CISA KEV' = ANY(tags);
