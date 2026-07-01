import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard, CheckSquare, FileText, FolderKanban, CalendarClock,
  GitBranch, Rss, Shield, ShieldCheck, LogOut, Code2, Plus, LayoutTemplate, UserCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { universalSearch } from "@/lib/universal-search.functions";
import { useI18n } from "@/lib/i18n";

type Item = { label: string; to?: string; icon: typeof LayoutDashboard; action?: () => void; group: string };

const KIND_ROUTE: Record<string, string> = {
  note: "/notes", todo: "/todos",
  diagram: "/diagrams", feed: "/feeds", snippet: "/snippets",
};

export function CommandPalette() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const navigate = useNavigate();
  const search = useServerFn(universalSearch);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data: results } = useQuery({
    queryKey: ["universal-search", debounced],
    queryFn: () => search({ data: { q: debounced } }),
    enabled: open && debounced.length >= 2,
    staleTime: 30_000,
  });

  const items: Item[] = [
    { group: "Créer", label: "Capture rapide (todo / note / lien)", icon: Plus,
      action: () => window.dispatchEvent(new CustomEvent("quickcapture:open")) },
    { group: "Créer", label: "Nouveau snippet", to: "/snippets", icon: Code2 },
    { group: "Créer", label: "Nouveau diagramme", to: "/diagrams", icon: GitBranch },
    { group: "Créer", label: "Nouvelle note depuis template", to: "/templates", icon: LayoutTemplate },
    { group: "Navigation", label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    { group: "Navigation", label: "Todos", to: "/todos", icon: CheckSquare },
    { group: "Navigation", label: "Notes", to: "/notes", icon: FileText },
    { group: "Navigation", label: "Templates", to: "/templates", icon: LayoutTemplate },
    { group: "Navigation", label: "Projets", to: "/projects", icon: FolderKanban },
    { group: "Navigation", label: "Réunions", to: "/meetings", icon: CalendarClock },
    { group: "Navigation", label: "Diagrammes", to: "/diagrams", icon: GitBranch },
    { group: "Navigation", label: "Feeds", to: "/feeds", icon: Rss },
    { group: "Navigation", label: "Snippets", to: "/snippets", icon: Code2 },
    { group: "Navigation", label: "Sécurité", to: "/security", icon: ShieldCheck },
    { group: "Navigation", label: "Profil", to: "/profile", icon: UserCircle2 },
    { group: "Admin", label: "Console admin", to: "/admin", icon: Shield },
    {
      group: "Actions", label: "Se déconnecter", icon: LogOut,
      action: async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); },
    },
  ];


  const hits = results?.hits ?? [];
  const grouped = hits.reduce<Record<string, typeof hits>>((acc, h) => {
    (acc[h.kind] ||= []).push(h);
    return acc;
  }, {});

  const SEARCH_GROUPS: { kind: string; key: string; icon: typeof FileText }[] = [
    { kind: "note", key: "search.notes", icon: FileText },
    { kind: "todo", key: "search.todos", icon: CheckSquare },
    { kind: "diagram", key: "search.diagrams", icon: GitBranch },
    { kind: "feed", key: "search.feeds", icon: Rss },
    { kind: "snippet", key: "search.snippets", icon: Code2 },
  ];

  const groups = Array.from(new Set(items.map((i) => i.group)));

  return (
    <CommandDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
      <CommandInput
        placeholder="Tapez une commande ou recherchez…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{t("search.empty")}</CommandEmpty>

        {SEARCH_GROUPS.map((g) =>
          grouped[g.kind]?.length ? (
            <CommandGroup key={g.kind} heading={t(g.key as never)}>
              {grouped[g.kind].map((h) => {
                const Icon = g.icon;
                return (
                  <CommandItem
                    key={`${g.kind}-${h.id}`}
                    value={`${g.kind}-${h.id}-${h.title}`}
                    onSelect={() => {
                      setOpen(false);
                      navigate({ to: KIND_ROUTE[g.kind] ?? "/dashboard" });
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{h.title}</span>
                    {h.subtitle && (
                      <span className="ml-auto text-[10px] text-muted-foreground truncate max-w-[200px]">
                        {h.subtitle}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ) : null,
        )}

        {groups.map((g) => (
          <CommandGroup key={g} heading={g}>
            {items.filter((i) => i.group === g).map((i) => {
              const Icon = i.icon;
              return (
                <CommandItem
                  key={i.label}
                  onSelect={() => {
                    setOpen(false);
                    if (i.to) navigate({ to: i.to });
                    else i.action?.();
                  }}
                >
                  <Icon className="h-4 w-4" />
                  <span>{i.label}</span>
                  {i.to === "/dashboard" && <CommandShortcut>⌘K</CommandShortcut>}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
