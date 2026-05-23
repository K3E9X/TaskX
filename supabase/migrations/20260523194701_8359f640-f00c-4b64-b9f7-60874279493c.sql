CREATE OR REPLACE FUNCTION public.get_engagement_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  dau int; wau int; mau int; total_views int;
  top_paths jsonb; views_per_day jsonb;
BEGIN
  -- Admin check is enforced by the calling server function (assertAdmin).
  -- This RPC is invoked via the service-role client, so auth.uid() is null here.
  SELECT COUNT(DISTINCT user_id) INTO dau FROM public.page_views WHERE created_at >= now() - interval '1 day';
  SELECT COUNT(DISTINCT user_id) INTO wau FROM public.page_views WHERE created_at >= now() - interval '7 days';
  SELECT COUNT(DISTINCT user_id) INTO mau FROM public.page_views WHERE created_at >= now() - interval '30 days';
  SELECT COUNT(*) INTO total_views FROM public.page_views WHERE created_at >= now() - interval '30 days';

  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO top_paths FROM (
    SELECT path, COUNT(*) AS views, COUNT(DISTINCT user_id) AS uniques
    FROM public.page_views WHERE created_at >= now() - interval '30 days'
    GROUP BY path ORDER BY views DESC LIMIT 20
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.day), '[]'::jsonb) INTO views_per_day FROM (
    SELECT to_char(date_trunc('day', created_at), 'MM-DD') AS day,
           COUNT(*) AS views, COUNT(DISTINCT user_id) AS uniques
    FROM public.page_views WHERE created_at >= now() - interval '30 days'
    GROUP BY 1
  ) t;

  result := jsonb_build_object(
    'dau', dau, 'wau', wau, 'mau', mau,
    'total_views_30d', total_views,
    'top_paths', top_paths, 'views_per_day', views_per_day
  );
  RETURN result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_engagement_stats() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_engagement_stats() TO service_role;