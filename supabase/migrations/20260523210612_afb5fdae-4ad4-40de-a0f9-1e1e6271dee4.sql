
CREATE TABLE public.snippets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  command text NOT NULL DEFAULT '',
  description text,
  language text NOT NULL DEFAULT 'bash',
  tags text[] NOT NULL DEFAULT '{}'::text[],
  favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY snippets_select_own ON public.snippets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY snippets_insert_own ON public.snippets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY snippets_update_own ON public.snippets FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY snippets_delete_own ON public.snippets FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER snippets_set_updated_at
BEFORE UPDATE ON public.snippets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_snippets_user_updated ON public.snippets (user_id, updated_at DESC);
