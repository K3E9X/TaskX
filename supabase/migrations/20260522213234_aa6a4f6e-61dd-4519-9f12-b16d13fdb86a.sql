-- Feed items (CVE / CTI / X watch)
CREATE TYPE public.feed_source AS ENUM ('cve', 'cti', 'x', 'rss', 'other');
CREATE TYPE public.feed_severity AS ENUM ('info', 'low', 'medium', 'high', 'critical');

CREATE TABLE public.feed_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source public.feed_source NOT NULL DEFAULT 'other',
  severity public.feed_severity NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT,
  external_id TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feed_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY feed_items_select_own ON public.feed_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY feed_items_insert_own ON public.feed_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY feed_items_update_own ON public.feed_items FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY feed_items_delete_own ON public.feed_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER feed_items_set_updated_at BEFORE UPDATE ON public.feed_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX feed_items_user_published_idx ON public.feed_items (user_id, published_at DESC);

-- Tips (Linux commands & techniques)
CREATE TABLE public.tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  command TEXT,
  explanation TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] NOT NULL DEFAULT '{}',
  favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY tips_select_own ON public.tips FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY tips_insert_own ON public.tips FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY tips_update_own ON public.tips FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY tips_delete_own ON public.tips FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER tips_set_updated_at BEFORE UPDATE ON public.tips
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Bookmarks (add-ons / useful links)
CREATE TABLE public.bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY bookmarks_select_own ON public.bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY bookmarks_insert_own ON public.bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY bookmarks_update_own ON public.bookmarks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY bookmarks_delete_own ON public.bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER bookmarks_set_updated_at BEFORE UPDATE ON public.bookmarks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();