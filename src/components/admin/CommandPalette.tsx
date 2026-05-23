import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard, CheckSquare, FileText, Repeat, FolderKanban, CalendarClock,
  GitBranch, Rss, Terminal, Bookmark, Users, Shield, Gauge, ShieldCheck, LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Item = { label: string; to?: string; icon: typeof LayoutDashboard; action?: () => void; group: string };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

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

  const items: Item[] = [
    { group: "Navigation", label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    { group: "Navigation", label: "Cockpit", to: "/cockpit", icon: Gauge },
    { group: "Navigation", label: "Todos", to: "/todos", icon: CheckSquare },
    { group: "Navigation", label: "Notes", to: "/notes", icon: FileText },
    { group: "Navigation", label: "Routines", to: "/routines", icon: Repeat },
    { group: "Navigation", label: "Projets", to: "/projects", icon: FolderKanban },
    { group: "Navigation", label: "Réunions", to: "/meetings", icon: CalendarClock },
    { group: "Navigation", label: "Diagrammes", to: "/diagrams", icon: GitBranch },
    { group: "Navigation", label: "Feeds", to: "/feeds", icon: Rss },
    { group: "Navigation", label: "Tips", to: "/tips", icon: Terminal },
    { group: "Navigation", label: "Bookmarks", to: "/bookmarks", icon: Bookmark },
    { group: "Navigation", label: "Équipe", to: "/team", icon: Users },
    { group: "Navigation", label: "Sécurité", to: "/security", icon: ShieldCheck },
    { group: "Admin", label: "Console admin", to: "/admin", icon: Shield },
    {
      group: "Actions", label: "Se déconnecter", icon: LogOut,
      action: async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); },
    },
  ];

  const groups = Array.from(new Set(items.map((i) => i.group)));

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Tapez une commande ou recherchez…" />
      <CommandList>
        <CommandEmpty>Aucun résultat.</CommandEmpty>
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
