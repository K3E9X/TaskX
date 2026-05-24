-- 1. Drop old tips table and related profile column
DROP TABLE IF EXISTS public.tips CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS auto_tip_enabled;

-- 2. New global usage_tips table (admin-curated)
CREATE TABLE public.usage_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  module text NOT NULL DEFAULT 'general',
  icon text,
  link text,
  shortcut text,
  published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX usage_tips_published_idx ON public.usage_tips (published, published_at DESC);
CREATE INDEX usage_tips_module_idx ON public.usage_tips (module);

ALTER TABLE public.usage_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY usage_tips_select_all ON public.usage_tips
  FOR SELECT TO authenticated
  USING (published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY usage_tips_admin_all ON public.usage_tips
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER usage_tips_set_updated_at
  BEFORE UPDATE ON public.usage_tips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Per-user "seen" tracking
CREATE TABLE public.user_tip_views (
  user_id uuid NOT NULL,
  tip_id uuid NOT NULL REFERENCES public.usage_tips(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tip_id)
);

CREATE INDEX user_tip_views_user_idx ON public.user_tip_views (user_id);

ALTER TABLE public.user_tip_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_tip_views_select_own ON public.user_tip_views
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY user_tip_views_insert_own ON public.user_tip_views
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_tip_views_delete_own ON public.user_tip_views
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Seed initial usage tips
INSERT INTO public.usage_tips (title, body, module, icon, link, shortcut) VALUES
  ('Recherche universelle', 'Ouvre la palette de commande pour naviguer ou chercher dans tes notes, todos, snippets, diagrammes et feeds.', 'shortcuts', 'Search', null, '⌘ K'),
  ('Quick capture', 'Capture une todo, une note ou un bookmark en 2 secondes sans changer de page.', 'shortcuts', 'Zap', null, 'N'),
  ('Snippets à portée de main', 'Stocke tes commandes nmap, kubectl, ffuf… et copie-les en un clic depuis n''importe quelle page.', 'snippets', 'Code2', '/snippets', 'S'),
  ('Templates de notes', 'Démarre une note depuis un template métier (ADR, finding pentest, timeline forensic, shift handover SOC).', 'notes', 'FileText', '/templates', null),
  ('Diagrammes Mermaid live', 'Tape ton Mermaid à gauche, vois le rendu se mettre à jour à droite. Idéal pour archi, threat models, kill chains.', 'diagrams', 'GitBranch', '/diagrams', null),
  ('Cockpit du matin', 'Le Morning Brief résume ton overdue, tes routines du jour et les CVE critiques. Lis-le café à la main.', 'workflows', 'Coffee', '/dashboard', null),
  ('Routines récurrentes', 'Crée une routine quotidienne ou hebdomadaire (revue de tickets, ménage Slack, lecture CTI) et coche les étapes au fil de la journée.', 'workflows', 'Repeat', '/routines', null),
  ('Feeds CVE / CTI', 'Ajoute tes flux RSS (CISA KEV, NVD, Hacker News) — TaskX rafraîchit chaque heure et marque la sévérité.', 'workflows', 'Rss', '/feeds', null),
  ('Bienvenue dans TaskX', 'TaskX est ton workspace quotidien personnel cyber. Ces tips t''aident à découvrir tout ce qu''il sait faire — reviens régulièrement, on en ajoute.', 'whats-new', 'Sparkles', null, null);