import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useI18n, LangToggle, type TKey } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, CheckSquare, FileText, Repeat, FolderKanban,
  CalendarClock, GitBranch, Rss, Terminal, Bookmark, Users, LogOut, Gauge, Shield,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

const NAV: { to: string; key: TKey; icon: typeof LayoutDashboard }[] = [
  { to: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { to: "/cockpit", key: "nav.cockpit", icon: Gauge },
  { to: "/todos", key: "nav.todos", icon: CheckSquare },
  { to: "/notes", key: "nav.notes", icon: FileText },
  { to: "/routines", key: "nav.routines", icon: Repeat },
  { to: "/projects", key: "nav.projects", icon: FolderKanban },
  { to: "/meetings", key: "nav.meetings", icon: CalendarClock },
  { to: "/diagrams", key: "nav.diagrams", icon: GitBranch },
  { to: "/feeds", key: "nav.feeds", icon: Rss },
  { to: "/tips", key: "nav.tips", icon: Terminal },
  { to: "/bookmarks", key: "nav.bookmarks", icon: Bookmark },
  { to: "/team", key: "nav.team", icon: Users },
];

function AuthenticatedLayout() {
  const { session, loading, signOut } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">{t("common.loading")}</div>;
  }
  if (!session) return null;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 border-r bg-sidebar text-sidebar-foreground transform transition-transform md:static md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-14 flex flex-col justify-center px-4 border-b">
          <span className="text-sm font-semibold tracking-tight leading-none">TaskX</span>
          <span className="mt-1 text-[10px] text-muted-foreground leading-none">{t("app.tagline")}</span>
        </div>
        <nav className="p-2 space-y-0.5 text-sm">
          {NAV.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60 text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{t(item.key)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t p-3">
          <UserChip email={session.user.email ?? ""} onSignOut={async () => { await signOut(); navigate({ to: "/login" }); }} />
        </div>
      </aside>

      <div className="flex-1 flex flex-col md:ml-0 min-w-0">
        <header className="h-14 border-b flex items-center justify-between px-4 md:px-6">
          <button onClick={() => setOpen(!open)} className="md:hidden text-sm">{t("common.menu")}</button>
          <div className="text-xs text-muted-foreground hidden md:block">{pathname}</div>
          <LangToggle />
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 bg-black/30 z-30 md:hidden" />}
    </div>
  );
}

function UserChip({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState<string>(email);
  useEffect(() => {
    supabase.from("profiles").select("display_name").maybeSingle().then(({ data }) => {
      if (data?.display_name) setName(data.display_name);
    });
  }, []);
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="h-7 w-7 rounded-full bg-accent flex items-center justify-center text-[11px] font-medium">
        {name.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate text-xs font-medium">{name}</div>
        <div className="truncate text-[10px] text-muted-foreground">{email}</div>
      </div>
      <button onClick={onSignOut} className="text-muted-foreground hover:text-foreground" title={t("common.signout")}>
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
