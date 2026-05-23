import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats } from "@/lib/admin.functions";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Users,
  CheckSquare,
  FileText,
  Bookmark,
  FolderKanban,
  CalendarClock,
  GitBranch,
  Terminal,
  Rss,
  Repeat,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — TaskX" },
      {
        name: "description",
        content:
          "Admin panel for TaskX: manage users, roles, RBAC permissions and platform settings for your cybersecurity workspace.",
      },
      { property: "og:title", content: "Admin — TaskX" },
      {
        property: "og:description",
        content:
          "Admin panel for TaskX: manage users, roles, RBAC permissions and platform settings for your cybersecurity workspace.",
      },
      { property: "og:url", content: "https://taskxx.lovable.app/admin" },
    ],
    links: [{ rel: "canonical", href: "https://taskxx.lovable.app/admin" }],
  }),
  component: AdminPage,
});

const TABLE_ICONS: Record<string, typeof Users> = {
  profiles: Users,
  todos: CheckSquare,
  notes: FileText,
  bookmarks: Bookmark,
  projects: FolderKanban,
  meetings: CalendarClock,
  diagrams: GitBranch,
  tips: Terminal,
  feed_items: Rss,
  routines: Repeat,
};

const TABLE_LABELS: Record<string, string> = {
  profiles: "Comptes",
  todos: "Todos",
  notes: "Notes",
  bookmarks: "Bookmarks",
  projects: "Projets",
  meetings: "Meetings",
  diagrams: "Diagrammes",
  tips: "Tips",
  feed_items: "Veille",
  routines: "Routines",
};

const SEV_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
  info: "#3b82f6",
};

function AdminPage() {
  const stats = useServerFn(getAdminStats);

  const { data, isLoading, error } = useQuery({
    queryKey: ["adminStats"],
    queryFn: () => stats(),
    refetchInterval: 60_000,
    retry: false,
  });

  if (error && (error as Error).message.toLowerCase().includes("forbidden")) {
    return (
      <div className="mx-auto max-w-3xl px-4 md:px-8 py-12">
        <div className="rounded-lg border bg-card p-8 text-center">
          <Shield className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Accès réservé</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cette page est réservée aux administrateurs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8 py-8 space-y-6">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-amber-500" /> Admin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Statistiques, activité et logs · mise à jour auto toutes les 60s
          </p>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(data.totals).map(([key, val]) => {
              const Icon = TABLE_ICONS[key] ?? Activity;
              return (
                <div key={key} className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                      {TABLE_LABELS[key] ?? key}
                    </span>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold tabular-nums">{val}</div>
                </div>
              );
            })}
          </div>

          {/* Charts row */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Signups */}
            <ChartCard
              title="Inscriptions (30 derniers jours)"
              subtitle={`${data.usersCount} comptes au total`}
            >
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={data.signupsPerDay}
                  margin={{ top: 5, right: 8, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="signups" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      fontSize: 11,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="signups"
                    stroke="hsl(var(--primary))"
                    fill="url(#signups)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Activity */}
            <ChartCard title="Activité (30j)" subtitle="Création de contenu / jour">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.activity} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      fontSize: 11,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="todos"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="notes"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="feeds"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Severity */}
            <ChartCard title="Veille par sévérité" subtitle="Répartition des CVE/CTI">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.severityBreakdown}
                    dataKey="count"
                    nameKey="severity"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={{ fontSize: 11 }}
                  >
                    {data.severityBreakdown.map((entry) => (
                      <Cell key={entry.severity} fill={SEV_COLORS[entry.severity] ?? "#888"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      fontSize: 11,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Volume bar */}
            <ChartCard title="Volume par table" subtitle="Total cumulé">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={Object.entries(data.totals).map(([k, v]) => ({
                    name: TABLE_LABELS[k] ?? k,
                    count: v,
                  }))}
                  margin={{ top: 5, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    angle={-25}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Cron logs */}
          <div className="rounded-lg border bg-card">
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Logs cron (20 derniers)
              </h3>
              <Badge variant="outline" className="text-[10px]">
                tâches planifiées
              </Badge>
            </div>
            <div className="px-2 pb-3 overflow-x-auto">
              {data.cronRuns.length === 0 ? (
                <p className="px-3 py-4 text-xs text-muted-foreground">Aucun passage récent.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b">
                      <th className="text-left px-3 py-2 font-medium">Job</th>
                      <th className="text-left px-3 py-2 font-medium">Statut</th>
                      <th className="text-left px-3 py-2 font-medium">Démarré</th>
                      <th className="text-left px-3 py-2 font-medium">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cronRuns.map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-2 font-mono">{r.jobname}</td>
                        <td className="px-3 py-2">
                          <Badge
                            variant="outline"
                            className={`h-5 text-[10px] ${
                              r.status === "succeeded"
                                ? "border-green-500/30 text-green-500 bg-green-500/10"
                                : r.status === "failed"
                                  ? "border-red-500/30 text-red-500 bg-red-500/10"
                                  : "border-amber-500/30 text-amber-500 bg-amber-500/10"
                            }`}
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {new Date(r.start_time).toLocaleString("fr-FR")}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground truncate max-w-xs">
                          {r.return_message ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Sources & recent feeds */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card">
              <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Sources RSS
                </h3>
                <Badge variant="outline" className="text-[10px]">
                  {data.sources.length}
                </Badge>
              </div>
              <div className="px-5 pb-4 space-y-2">
                {data.sources.slice(0, 12).map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{s.name}</div>
                      <div className="truncate text-[10px] text-muted-foreground">{s.url}</div>
                    </div>
                    <Badge variant="outline" className="h-5 text-[9px]">
                      {s.source_type}
                    </Badge>
                    {!s.enabled && (
                      <Badge variant="outline" className="h-5 text-[9px] text-muted-foreground">
                        off
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-card">
              <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Veille — derniers items
                </h3>
                <Badge variant="outline" className="text-[10px]">
                  {data.recentFeeds.length}
                </Badge>
              </div>
              <div className="px-5 pb-4 space-y-2">
                {data.recentFeeds.map((f) => (
                  <div key={f.id} className="flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{f.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(f.published_at).toLocaleString("fr-FR")} · {f.source}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="h-5 text-[9px]"
                      style={{
                        borderColor: (SEV_COLORS[f.severity] ?? "#888") + "55",
                        color: SEV_COLORS[f.severity] ?? "#888",
                      }}
                    >
                      {f.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
