-- 1. Profile additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dashboard_widgets text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;

-- 2. Daily activity table
CREATE TABLE IF NOT EXISTS public.daily_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  day date NOT NULL DEFAULT CURRENT_DATE,
  todos_done int NOT NULL DEFAULT 0,
  notes_edited int NOT NULL DEFAULT 0,
  feed_read int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);

ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_activity_select_own" ON public.daily_activity
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "daily_activity_insert_own" ON public.daily_activity
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_activity_update_own" ON public.daily_activity
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER set_daily_activity_updated_at
  BEFORE UPDATE ON public.daily_activity
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_daily_activity_user_day
  ON public.daily_activity(user_id, day DESC);

-- 3. Streak function
CREATE OR REPLACE FUNCTION public.get_current_streak()
RETURNS int
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  streak int := 0;
  d date := CURRENT_DATE;
  has_row boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN 0;
  END IF;
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.daily_activity
      WHERE user_id = uid AND day = d
        AND (todos_done > 0 OR notes_edited > 0 OR feed_read > 0)
    ) INTO has_row;
    IF NOT has_row THEN
      -- Allow today to be empty without breaking the streak
      IF d = CURRENT_DATE THEN
        d := d - 1;
        CONTINUE;
      END IF;
      EXIT;
    END IF;
    streak := streak + 1;
    d := d - 1;
    IF streak > 365 THEN EXIT; END IF;
  END LOOP;
  RETURN streak;
END;
$$;

-- 4. Update handle_new_user to preserve existing behavior (no change needed —
-- new columns have defaults). Recreating just to be explicit/idempotent.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  insert into public.profiles (id, display_name, team_role, first_name, last_name, onboarded, dashboard_widgets)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'team_role')::public.team_role, 'architect'),
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
$$;