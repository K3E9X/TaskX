
CREATE OR REPLACE FUNCTION public.get_cron_recent_runs()
RETURNS TABLE (
  jobname text,
  status text,
  return_message text,
  start_time timestamptz,
  end_time timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
    SELECT j.jobname, r.status, r.return_message, r.start_time, r.end_time
    FROM cron.job_run_details r
    JOIN cron.job j ON j.jobid = r.jobid
    ORDER BY r.start_time DESC
    LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cron_recent_runs() TO authenticated;
