ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS ip text;
CREATE INDEX IF NOT EXISTS page_views_user_created_idx ON public.page_views (user_id, created_at DESC);