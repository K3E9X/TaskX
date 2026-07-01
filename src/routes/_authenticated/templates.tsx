import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { NOTE_TEMPLATES, renderTemplate, type TemplateRole, type NoteTemplate } from "@/lib/note-templates";
import { FileText, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({
    meta: [
      { title: "Templates — TaskX" },
      { name: "description", content: "Ready-to-fill note templates for pentesters, forensic analysts, architects, SOC analysts and CISOs." },
      { property: "og:title", content: "Templates — TaskX" },
      { property: "og:description", content: "Ready-to-fill note templates for every cyber role." },
      { property: "og:url", content: "https://taskxx.lovable.app/templates" },
    ],
    links: [{ rel: "canonical", href: "https://taskxx.lovable.app/templates" }],
  }),
  component: TemplatesPage,
});

const ROLES: { id: TemplateRole | "all"; fr: string; en: string }[] = [
  { id: "all", fr: "Tous", en: "All" },
  { id: "pentester", fr: "Pentester", en: "Pentester" },
  { id: "forensic", fr: "Forensic", en: "Forensic" },
  { id: "architect", fr: "Architecte", en: "Architect" },
  { id: "soc", fr: "SOC", en: "SOC" },
  { id: "ciso", fr: "CISO", en: "CISO" },
  { id: "universal", fr: "Universel", en: "Universal" },
];

function TemplatesPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<TemplateRole | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile-role"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("profile_type").maybeSingle();
      return data;
    },
  });

  // Default filter to user's role on first load
  useEffect(() => {
    if (profile?.profile_type && selectedRole === "all") {
      const role = profile.profile_type as TemplateRole;
      if (ROLES.some((r) => r.id === role)) setSelectedRole(role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.profile_type]);

  const filtered = useMemo(() => {
    return NOTE_TEMPLATES.filter((tpl) => {
      if (selectedRole !== "all") {
        if (tpl.role !== selectedRole && tpl.role !== "universal") return false;
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        const title = tpl[lang].title.toLowerCase();
        const tagHit = tpl.tags?.some((tag) => tag.toLowerCase().includes(q));
        if (!title.includes(q) && !tpl.id.includes(q) && !tagHit) return false;
      }
      return true;
    });
  }, [selectedRole, query, lang]);

  const selected: NoteTemplate | null =
    filtered.find((x) => x.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (!selectedId && filtered[0]) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((x) => x.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedId]);

  const useTemplate = async () => {
    if (!selected) return;
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { title, body } = renderTemplate(selected, lang);
      const { error } = await supabase
        .from("notes")
        .insert({ user_id: user.id, title, content: body, tags: selected.tags ?? [] });
      if (error) throw error;
      toast.success(t("tpl.page.created"));
      navigate({ to: "/notes" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("tpl.page.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("tpl.page.subtitle")}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {ROLES.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRole(r.id)}
            className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${
              selectedRole === r.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
          >
            {lang === "fr" ? r.fr : r.en}
          </button>
        ))}
        <Input
          placeholder={t("tpl.search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 text-xs ml-auto w-56"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[320px_1fr] min-h-[60vh]">
        <aside className="rounded-lg border bg-card overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b text-[11px] uppercase tracking-wider text-muted-foreground">
            {filtered.length} {filtered.length > 1 ? t("tpl.page.results") : t("tpl.page.result")}
          </div>
          <ul className="overflow-auto divide-y">
            {filtered.length === 0 && (
              <li className="p-6 text-center text-xs text-muted-foreground">{t("tpl.empty")}</li>
            )}
            {filtered.map((tpl) => (
              <li key={tpl.id}>
                <button
                  onClick={() => setSelectedId(tpl.id)}
                  className={`w-full text-left p-3 transition-colors ${
                    selected?.id === tpl.id ? "bg-accent" : "hover:bg-accent/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium leading-tight">{tpl[lang].title}</span>
                    <Badge variant="outline" className="h-5 text-[10px] shrink-0 capitalize">
                      {tpl.role}
                    </Badge>
                  </div>
                  {tpl.tags && tpl.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {tpl.tags.map((tag) => (
                        <span key={tag} className="text-[10px] text-muted-foreground">#{tag}</span>
                      ))}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="rounded-lg border bg-card flex flex-col min-h-0">
          {selected ? (
            <>
              <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{selected[lang].title}</div>
                  <div className="text-[11px] text-muted-foreground capitalize">{selected.role}</div>
                </div>
                <Button size="sm" onClick={useTemplate} disabled={creating}>
                  <FileText className="h-3.5 w-3.5" />
                  {creating ? t("common.loading") : t("tpl.page.useTemplate")}
                </Button>
              </div>
              <div className="flex-1 overflow-auto p-6">
                <article className="markdown text-sm leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {renderTemplate(selected, lang).body}
                  </ReactMarkdown>
                </article>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              {t("tpl.empty")}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
