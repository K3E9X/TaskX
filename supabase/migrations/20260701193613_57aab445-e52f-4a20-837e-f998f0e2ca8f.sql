
-- 1. TODOS : ajout récurrence (absorbe Routines)
ALTER TABLE public.todos
  ADD COLUMN IF NOT EXISTS recurrence text CHECK (recurrence IN ('daily','weekly','monthly','yearly')),
  ADD COLUMN IF NOT EXISTS recurrence_interval int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_completed_at timestamptz;

-- 2. NOTES : ajout kind + link_url (absorbe Bookmarks)
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'note' CHECK (kind IN ('note','link','runbook')),
  ADD COLUMN IF NOT EXISTS link_url text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 3. MIGRATION Routines -> Todos (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='routines') THEN
    INSERT INTO public.todos (user_id, title, notes, recurrence, recurrence_interval, created_at, updated_at)
    SELECT
      r.user_id,
      r.title,
      COALESCE(r.description, ''),
      CASE
        WHEN r.frequency IN ('daily','weekly','monthly','yearly') THEN r.frequency
        ELSE 'daily'
      END,
      COALESCE(r.interval_value, 1),
      r.created_at,
      r.updated_at
    FROM public.routines r
    WHERE NOT EXISTS (
      SELECT 1 FROM public.todos t
      WHERE t.user_id = r.user_id AND t.title = r.title AND t.recurrence IS NOT NULL
    );
  END IF;
EXCEPTION WHEN undefined_column THEN
  -- Colonnes différentes, on ignore la migration data
  NULL;
END $$;

-- 4. MIGRATION Bookmarks -> Notes (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bookmarks') THEN
    INSERT INTO public.notes (user_id, title, content, kind, link_url, tags, created_at, updated_at)
    SELECT
      b.user_id,
      COALESCE(b.title, b.url),
      COALESCE(b.description, ''),
      'link',
      b.url,
      COALESCE(b.tags, '{}'::text[]),
      b.created_at,
      COALESCE(b.updated_at, b.created_at)
    FROM public.bookmarks b;
  END IF;
EXCEPTION WHEN undefined_column THEN
  NULL;
END $$;

-- 5. DROP des tables fusionnées / supprimées
DROP TABLE IF EXISTS public.routine_runs CASCADE;
DROP TABLE IF EXISTS public.routines CASCADE;
DROP TABLE IF EXISTS public.bookmarks CASCADE;
DROP TABLE IF EXISTS public.user_tip_views CASCADE;
DROP TABLE IF EXISTS public.usage_tips CASCADE;

-- 6. PROFILES : suppression team_role, ajout profile_type + stack_tags
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='team_role') THEN
    ALTER TABLE public.profiles DROP COLUMN team_role;
  END IF;
END $$;

DROP TYPE IF EXISTS public.team_role CASCADE;

DO $$ BEGIN
  CREATE TYPE public.profile_type AS ENUM ('pentester','soc','ciso','architect','forensic');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_type public.profile_type,
  ADD COLUMN IF NOT EXISTS stack_tags text[] DEFAULT '{}';

-- 7. Mise à jour handle_new_user (retire team_role, garde le reste)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, display_name, first_name, last_name, onboarded, dashboard_widgets)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    false,
    '{}'::text[]
  );

  insert into public.user_roles (user_id, role) values (new.id, 'member');

  insert into public.rss_sources (user_id, name, url, source_type, default_severity) values
    (new.id, 'The Hacker News', 'https://feeds.feedburner.com/TheHackersNews', 'cti', 'medium'),
    (new.id, 'BleepingComputer', 'https://www.bleepingcomputer.com/feed/', 'cti', 'medium'),
    (new.id, 'CISA KEV', 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', 'cve', 'high'),
    (new.id, 'NVD Recent CVEs', 'https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=20', 'cve', 'medium');

  return new;
end;
$function$;

-- 8. Index utile pour todos récurrents
CREATE INDEX IF NOT EXISTS idx_todos_recurrence ON public.todos(user_id, recurrence) WHERE recurrence IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_kind ON public.notes(user_id, kind);
