CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, display_name, team_role, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'team_role')::public.team_role, 'architect'),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  );

  -- All new users default to member. Admins are promoted manually via the admin panel.
  insert into public.user_roles (user_id, role) values (new.id, 'member');

  insert into public.rss_sources (user_id, name, url, source_type, default_severity) values
    (new.id, 'The Hacker News', 'https://feeds.feedburner.com/TheHackersNews', 'cti', 'medium'),
    (new.id, 'BleepingComputer', 'https://www.bleepingcomputer.com/feed/', 'cti', 'medium'),
    (new.id, 'CISA KEV', 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', 'cve', 'high'),
    (new.id, 'NVD Recent CVEs', 'https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=20', 'cve', 'medium');

  return new;
end;
$function$;