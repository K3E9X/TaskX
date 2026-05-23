import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Info, AlertTriangle, ShieldAlert, X } from "lucide-react";
import { listActiveAnnouncements } from "@/lib/admin-console.functions";

const DISMISS_KEY = "taskx.announcements.dismissed";

function getDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(DISMISS_KEY) ?? "[]"); }
  catch { return []; }
}

export function AnnouncementBanner() {
  const fn = useServerFn(listActiveAnnouncements);
  const { data } = useQuery({
    queryKey: ["announcements", "active"],
    queryFn: () => fn(),
    refetchInterval: 60_000,
    retry: false,
  });
  const [dismissed, setDismissed] = useState<string[]>(getDismissed);

  useEffect(() => { setDismissed(getDismissed()); }, []);

  const visible = (data ?? []).filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
  };

  return (
    <div className="space-y-1">
      {visible.map((a) => {
        const Icon = a.level === "critical" ? ShieldAlert : a.level === "warning" ? AlertTriangle : Info;
        const cls =
          a.level === "critical" ? "bg-destructive/10 text-destructive border-destructive/30"
          : a.level === "warning" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
          : "bg-primary/5 text-foreground border-primary/20";
        return (
          <div key={a.id} className={`flex items-start gap-2 px-4 py-2 text-xs border-b ${cls}`}>
            <Icon className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="flex-1">{a.message}</p>
            <button onClick={() => dismiss(a.id)} aria-label="Fermer" className="opacity-60 hover:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
