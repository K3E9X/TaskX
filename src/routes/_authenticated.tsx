import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { useI18n, LangToggle, type TKey } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { trackPageView } from "@/lib/admin-console.functions";
import {
  LayoutDashboard, CheckSquare, FileText, FolderKanban,
  CalendarClock, GitBranch, Rss, LogOut, Shield,
  PanelLeftClose, PanelLeftOpen, ShieldCheck, Code2, LayoutTemplate, UserCircle2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskXMark } from "@/components/brand/TaskXLogo";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { AnnouncementBanner } from "@/components/admin/AnnouncementBanner";
import { QuickCaptureDialog, useQuickCapture } from "@/components/QuickCaptureDialog";
import { StreakBadge } from "@/components/StreakBadge";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { GlobalAssistant } from "@/components/GlobalAssistant";




export const Route = createFileRoute("/_authenticated")({
  head: () => ({
    meta: [
      // Private/authenticated app — keep out of search engines and social previews.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthenticatedLayout,
});

const NAV: { to: string; key: TKey; icon: typeof LayoutDashboard }[] = [
  { to: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { to: "/todos", key: "nav.todos", icon: CheckSquare },
  { to: "/notes", key: "nav.notes", icon: FileText },
  { to: "/templates", key: "nav.templates", icon: LayoutTemplate },
  { to: "/snippets", key: "nav.snippets", icon: Code2 },
  { to: "/projects", key: "nav.projects", icon: FolderKanban },
  { to: "/meetings", key: "nav.meetings", icon: CalendarClock },
  { to: "/diagrams", key: "nav.diagrams", icon: GitBranch },
  { to: "/feeds", key: "nav.feeds", icon: Rss },
  { to: "/security", key: "nav.security", icon: ShieldCheck },
];

const SIDEBAR_KEY = "taskx.sidebar.collapsed";

function AuthenticatedLayout() {
  const { session, loading, signOut } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_KEY) === "1";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
    }
  }, [collapsed]);

  const { data: isAdmin } = useQuery({
    queryKey: ["sidebar-isAdmin", session?.user.id],
    enabled: !!session?.user.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles").select("role").eq("user_id", session!.user.id);
      return (data ?? []).some((r) => r.role === "admin");
    },
  });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  // MFA gate: if user has a verified TOTP factor but current AAL < required, force challenge.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (cancelled) return;
      if (data && data.currentLevel !== data.nextLevel) {
        navigate({ to: "/mfa-challenge" });
      }
    })();
    return () => { cancelled = true; };
  }, [session, navigate]);

  // Page-view tracking (lightweight, fire-and-forget)
  const track = useServerFn(trackPageView);
  const lastTracked = useRef<string>("");
  useEffect(() => {
    if (!session || lastTracked.current === pathname) return;
    lastTracked.current = pathname;
    track({
      data: {
        path: pathname,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : undefined,
        referrer: typeof document !== "undefined" ? document.referrer.slice(0, 500) : undefined,
      },
    }).catch(() => { /* silent */ });
  }, [pathname, session, track]);


  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">{t("common.loading")}</div>;
  }
  if (!session) return null;

  const sideW = collapsed ? "w-14" : "w-60";

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-40 ${sideW} border-r bg-sidebar text-sidebar-foreground transform transition-[width,transform] duration-200 md:static md:translate-x-0 ${open ? "translate-x-0 w-60" : "-translate-x-full"}`}
      >
        <div className={`h-14 flex items-center border-b ${collapsed ? "justify-center px-0" : "gap-2 px-4"}`}>
          <TaskXMark size={26} />
          {!collapsed && (
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-sm font-semibold tracking-tight flex items-baseline">
                <span>Task</span>
                <span className="ml-[1px] bg-gradient-to-br from-[oklch(0.74_0.18_295)] to-[oklch(0.78_0.15_200)] bg-clip-text text-transparent font-bold">X</span>
              </span>
              <span className="mt-1 text-[10px] text-muted-foreground truncate">{t("app.tagline")}</span>
            </div>
          )}
        </div>
        <nav className={`p-2 space-y-0.5 text-sm`}>
          {NAV.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                title={collapsed ? t(item.key) : undefined}
                aria-label={collapsed ? t(item.key) : undefined}
                className={`flex items-center gap-2.5 rounded-md ${collapsed ? "justify-center px-0 py-2" : "px-2.5 py-1.5"} transition-colors ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60 text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {!collapsed && <span className="truncate">{t(item.key)}</span>}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              title={collapsed ? "Admin" : undefined}
              aria-label={collapsed ? "Admin" : undefined}
              className={`flex items-center gap-2.5 rounded-md ${collapsed ? "justify-center px-0 py-2" : "px-2.5 py-1.5"} transition-colors ${
                pathname === "/admin" || pathname.startsWith("/admin/")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/60 text-amber-500/90"
              }`}
            >
              <Shield className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!collapsed && <span>Admin</span>}
            </Link>
          )}
        </nav>
        <div className={`absolute bottom-0 left-0 right-0 border-t ${collapsed ? "p-2" : "p-3"}`}>
          {collapsed ? (
            <button
              onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
              title={t("common.signout")}
              aria-label={t("common.signout")}
              className="w-full h-8 flex items-center justify-center rounded-md hover:bg-sidebar-accent/60 text-muted-foreground"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <UserChip email={session.user.email ?? ""} onSignOut={async () => { await signOut(); navigate({ to: "/login" }); }} />
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b flex items-center justify-between px-4 md:px-6 gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setOpen(!open)} aria-label={t("common.menu")} className="md:hidden text-sm">{t("common.menu")}</button>
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50"
              title={collapsed ? t("common.expand") : t("common.collapse")}
              aria-label={collapsed ? t("common.expand") : t("common.collapse")}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
            <div className="text-xs text-muted-foreground hidden md:block">{pathname}</div>
          </div>
          <div className="flex items-center gap-2">
            <StreakBadge />
            <LangToggle />
            <ProfileMenu
              email={session.user.email ?? ""}
              onSignOut={async () => { await signOut(); navigate({ to: "/login" }); }}
            />
          </div>
        </header>
        <AnnouncementBanner />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      <QuickCaptureMount />
      <GlobalAssistant />
      <OnboardingDialog />


      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 bg-black/30 z-30 md:hidden" />}
    </div>
  );
}

function QuickCaptureMount() {
  const { open, setOpen } = useQuickCapture();
  return <QuickCaptureDialog open={open} onOpenChange={setOpen} />;
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
      <button onClick={onSignOut} aria-label={t("common.signout")} className="text-muted-foreground hover:text-foreground" title={t("common.signout")}>
        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

function ProfileMenu({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState<string>(email);
  useEffect(() => {
    supabase.from("profiles").select("display_name").maybeSingle().then(({ data }) => {
      if (data?.display_name) setName(data.display_name);
    });
  }, []);
  const initials = (name || email).slice(0, 2).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-[11px] font-medium hover:ring-2 hover:ring-ring/40 transition"
        aria-label="Profile"
      >
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <span className="text-sm font-medium truncate">{name}</span>
            <span className="text-[11px] text-muted-foreground truncate">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="cursor-pointer">
            <UserCircle2 className="h-4 w-4 mr-2" />
            {t("profile.title")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="cursor-pointer">
          <LogOut className="h-4 w-4 mr-2" />
          {t("common.signout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
