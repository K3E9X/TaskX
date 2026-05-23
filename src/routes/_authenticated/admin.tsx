import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { getAdminStats } from "@/lib/admin.functions";
import {
  listUsersDetailed, inviteUser, suspendUser, unsuspendUser, deleteUser,
  sendPasswordReset, getUserDetails,
  getEngagement, getActiveSessions,
  getAuthLogs, getAdminActionLogs,
  listAllContent, deleteContent,
  listFeatureFlags, upsertFeatureFlag, deleteFeatureFlag,
  getSystemInfo,
  listUserNotes, addUserNote, deleteUserNote,
  listBlockedIps, blockIp, unblockIp,
  getTopUsers, getHourlyHeatmap, getCountryStats,
} from "@/lib/admin-console.functions";
import { setAppRole } from "@/lib/team.functions";
import {
  Shield, Users as UsersIcon, Activity, FileText, Flag, History, Server,
  Search, UserPlus, Ban, KeyRound, Trash2, RotateCw, ShieldCheck, ExternalLink,
  Globe, ShieldAlert, ArrowUpDown, StickyNote, Plus,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — TaskX" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const overview = useServerFn(getAdminStats);
  const { error } = useQuery({
    queryKey: ["adminGate"],
    queryFn: () => overview(),
    retry: false,
    staleTime: 60_000,
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
    <div className="mx-auto max-w-7xl px-4 md:px-8 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Shield className="h-6 w-6 text-amber-500" />
        <h1 className="text-2xl font-semibold tracking-tight">Console admin</h1>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview"><Activity className="h-3.5 w-3.5 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="users"><UsersIcon className="h-3.5 w-3.5 mr-1" />Users</TabsTrigger>
          <TabsTrigger value="sessions"><ShieldCheck className="h-3.5 w-3.5 mr-1" />Sessions</TabsTrigger>
          <TabsTrigger value="logs"><History className="h-3.5 w-3.5 mr-1" />Logs</TabsTrigger>
          <TabsTrigger value="content"><FileText className="h-3.5 w-3.5 mr-1" />Content</TabsTrigger>
          <TabsTrigger value="flags"><Flag className="h-3.5 w-3.5 mr-1" />Flags</TabsTrigger>
          <TabsTrigger value="security"><ShieldAlert className="h-3.5 w-3.5 mr-1" />Security</TabsTrigger>
          <TabsTrigger value="audit"><History className="h-3.5 w-3.5 mr-1" />Audit</TabsTrigger>
          <TabsTrigger value="system"><Server className="h-3.5 w-3.5 mr-1" />System</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6"><OverviewTab /></TabsContent>
        <TabsContent value="users" className="mt-6"><UsersTab /></TabsContent>
        <TabsContent value="sessions" className="mt-6"><SessionsTab /></TabsContent>
        <TabsContent value="logs" className="mt-6"><LogsTab /></TabsContent>
        <TabsContent value="content" className="mt-6"><ContentTab /></TabsContent>
        <TabsContent value="flags" className="mt-6"><FlagsTab /></TabsContent>
        <TabsContent value="security" className="mt-6"><SecurityTab /></TabsContent>
        <TabsContent value="audit" className="mt-6"><AuditTab /></TabsContent>
        <TabsContent value="system" className="mt-6"><SystemTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════ OVERVIEW ═══════════════════
function OverviewTab() {
  const fn = useServerFn(getAdminStats);
  const { data, isLoading } = useQuery({
    queryKey: ["adminStats"], queryFn: () => fn(), refetchInterval: 60_000, retry: false,
  });
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(data.totals).map(([k, v]) => (
          <div key={k} className="rounded-lg border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{k}</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">{v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Inscriptions 30j · {data.usersCount} comptes
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data.signupsPerDay}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Area type="monotone" dataKey="signups" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ═══════════════════ USERS ═══════════════════
function UsersTab() {
  const qc = useQueryClient();
  const list = useServerFn(listUsersDetailed);
  const invite = useServerFn(inviteUser);
  const setRole = useServerFn(setAppRole);
  const suspend = useServerFn(suspendUser);
  const unsuspend = useServerFn(unsuspendUser);
  const del = useServerFn(deleteUser);
  const reset = useServerFn(sendPasswordReset);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin", "users"], queryFn: () => list(), retry: false,
  });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "admin" | "member" | "banned" | "active7d">("all");
  const [sortKey, setSortKey] = useState<"email" | "created_at" | "last_sign_in_at" | "app_role">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = users.filter((u) => {
    if (q && !u.email.toLowerCase().includes(q.toLowerCase()) &&
        !u.display_name.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === "admin" && u.app_role !== "admin") return false;
    if (filter === "member" && u.app_role !== "member") return false;
    if (filter === "banned" && !u.is_banned) return false;
    if (filter === "active7d") {
      if (!u.last_sign_in_at) return false;
      const d = (Date.now() - new Date(u.last_sign_in_at).getTime()) / 86400000;
      if (d > 7) return false;
    }
    return true;
  }).sort((a, b) => {
    const av = (a[sortKey] ?? "") as string;
    const bv = (b[sortKey] ?? "") as string;
    return (av < bv ? -1 : av > bv ? 1 : 0) * (sortDir === "asc" ? 1 : -1);
  });

  const toggleSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  };
  const SortHead = ({ k, label }: { k: typeof sortKey; label: string }) => (
    <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
      {label}<ArrowUpDown className="h-3 w-3 opacity-50" />
    </button>
  );

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "users"] });
  const mut = <T,>(fn: () => Promise<T>, msg: string) =>
    fn().then(() => { toast.success(msg); refresh(); })
        .catch((e) => toast.error(e instanceof Error ? e.message : String(e)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher email ou nom…" className="pl-8 h-9" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
            <SelectItem value="member">Members</SelectItem>
            <SelectItem value="banned">Suspendus</SelectItem>
            <SelectItem value="active7d">Actifs 7j</SelectItem>
          </SelectContent>
        </Select>
        <InviteDialog onInvite={(email, role) => mut(() => invite({ data: { email, role } }), "Invitation envoyée")} />
        <Button variant="outline" size="sm" onClick={refresh}><RotateCw className="h-3.5 w-3.5" /></Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Inscription</TableHead>
                <TableHead>Dernière connexion</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">{u.email}</TableCell>
                  <TableCell className="text-xs">{[u.first_name, u.last_name].filter(Boolean).join(" ") || u.display_name || "—"}</TableCell>
                  <TableCell>
                    <Select value={u.app_role} onValueChange={(v) =>
                      mut(() => setRole({ data: { userId: u.id, role: v as "admin" | "member" } }), "Rôle mis à jour")}>
                      <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member" className="text-xs">member</SelectItem>
                        <SelectItem value="admin" className="text-xs">admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] h-5">{u.provider}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("fr-FR") : "—"}</TableCell>
                  <TableCell className="font-mono text-[11px]" title={u.last_ip_at ? `vu le ${new Date(u.last_ip_at).toLocaleString("fr-FR")}` : ""}>{u.last_ip ?? "—"}</TableCell>
                  <TableCell>
                    {u.is_banned ? <Badge variant="outline" className="text-[10px] h-5 border-red-500/40 text-red-500">suspendu</Badge>
                      : !u.email_confirmed_at ? <Badge variant="outline" className="text-[10px] h-5 border-amber-500/40 text-amber-500">non vérifié</Badge>
                      : <Badge variant="outline" className="text-[10px] h-5 border-green-500/40 text-green-500">actif</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <UserDetailsButton userId={u.id} email={u.email} />
                      <Button size="sm" variant="ghost" title="Reset password"
                        onClick={() => mut(() => reset({ data: { email: u.email } }), "Email reset envoyé")}>
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      {u.is_banned ? (
                        <Button size="sm" variant="ghost" title="Lever suspension"
                          onClick={() => mut(() => unsuspend({ data: { userId: u.id } }), "Suspension levée")}>
                          <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" title="Suspendre 24h"
                          onClick={() => mut(() => suspend({ data: { userId: u.id, hours: 24 } }), "User suspendu 24h")}>
                          <Ban className="h-3.5 w-3.5 text-amber-500" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" title="Supprimer"
                        onClick={() => { if (confirm(`Supprimer ${u.email} ? Irréversible.`)) mut(() => del({ data: { userId: u.id } }), "User supprimé"); }}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{filtered.length} utilisateur{filtered.length > 1 ? "s" : ""}</p>
    </div>
  );
}

function InviteDialog({ onInvite }: { onInvite: (email: string, role: "admin" | "member") => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><UserPlus className="h-3.5 w-3.5 mr-1" />Inviter</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Inviter un utilisateur</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input type="email" placeholder="email@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select value={role} onValueChange={(v) => setRole(v as "admin" | "member")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={() => { onInvite(email, role); setEmail(""); setOpen(false); }} disabled={!email}>
            Envoyer l'invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserDetailsButton({ userId, email }: { userId: string; email: string }) {
  const [open, setOpen] = useState(false);
  const fn = useServerFn(getUserDetails);
  const { data } = useQuery({
    queryKey: ["admin", "userDetails", userId],
    queryFn: () => fn({ data: { userId } }),
    enabled: open, retry: false,
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Détails"><ExternalLink className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="text-sm">{email}</DialogTitle></DialogHeader>
        {!data ? <p className="text-xs text-muted-foreground">Chargement…</p> : (
          <div className="space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Contenu</div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(data.counts).map(([k, v]) => (
                  <div key={k} className="rounded border bg-card p-2 text-center">
                    <div className="text-[10px] text-muted-foreground">{k}</div>
                    <div className="text-sm font-semibold">{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">50 dernières visites</div>
              <div className="max-h-64 overflow-y-auto text-xs space-y-0.5">
                {data.recentViews.map((v, i) => (
                  <div key={i} className="flex justify-between gap-2 py-0.5 border-b border-border/40">
                    <span className="font-mono truncate">{v.path}</span>
                    <span className="text-muted-foreground shrink-0">{new Date(v.created_at).toLocaleString("fr-FR")}</span>
                  </div>
                ))}
                {data.recentViews.length === 0 && <p className="text-muted-foreground">Aucune visite enregistrée.</p>}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════ SESSIONS / ENGAGEMENT ═══════════════════
function SessionsTab() {
  const eng = useServerFn(getEngagement);
  const sess = useServerFn(getActiveSessions);
  const { data: e } = useQuery({ queryKey: ["admin", "engagement"], queryFn: () => eng(), retry: false, refetchInterval: 60_000 });
  const { data: s = [] } = useQuery({ queryKey: ["admin", "sessions"], queryFn: () => sess(), retry: false, refetchInterval: 30_000 });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="En ligne (30 min)" value={s.length} />
        <Kpi label="DAU" value={e?.dau ?? "…"} />
        <Kpi label="WAU" value={e?.wau ?? "…"} />
        <Kpi label="MAU" value={e?.mau ?? "…"} />
      </div>

      {e && (
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Visites · 30 derniers jours</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={e.views_per_day}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="views" stroke="#3b82f6" dot={false} />
              <Line type="monotone" dataKey="uniques" stroke="#22c55e" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card">
          <div className="px-4 py-3 border-b text-xs uppercase tracking-wider text-muted-foreground">
            Utilisateurs en ligne (30 min)
          </div>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Email</TableHead><TableHead>Page</TableHead><TableHead>Vu il y a</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {s.map((u) => (
                <TableRow key={u.userId}>
                  <TableCell className="font-mono text-xs">{u.email}</TableCell>
                  <TableCell className="font-mono text-xs">{u.last_path}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {Math.round((Date.now() - new Date(u.last_seen_at).getTime()) / 60000)} min
                  </TableCell>
                </TableRow>
              ))}
              {s.length === 0 && <TableRow><TableCell colSpan={3} className="text-xs text-muted-foreground text-center py-6">Personne en ligne.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="px-4 py-3 border-b text-xs uppercase tracking-wider text-muted-foreground">
            Top pages (30j)
          </div>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Page</TableHead><TableHead className="text-right">Vues</TableHead><TableHead className="text-right">Uniques</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(e?.top_paths ?? []).map((p) => (
                <TableRow key={p.path}>
                  <TableCell className="font-mono text-xs truncate max-w-xs">{p.path}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{p.views}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{p.uniques}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════ LOGS ═══════════════════
function LogsTab() {
  const fn = useServerFn(getAuthLogs);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "authLogs"], queryFn: () => fn(), retry: false });
  const [q, setQ] = useState("");
  const entries = (data?.entries ?? []).filter((e) =>
    !q || [e.action, e.actor_username, e.ip_address].join(" ").toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer (action, email, IP)…" className="pl-8 h-9" />
        </div>
        <ExportCsvButton rows={entries} filename="auth-logs.csv" />
      </div>
      {data?.error && <p className="text-xs text-amber-500">⚠ {data.error}</p>}
      {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Date</TableHead><TableHead>Action</TableHead><TableHead>User</TableHead><TableHead>IP</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("fr-FR")}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] h-5">{e.action ?? "—"}</Badge></TableCell>
                  <TableCell className="text-xs font-mono">{e.actor_username ?? "—"}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{e.ip_address ?? "—"}</TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && <TableRow><TableCell colSpan={4} className="text-xs text-muted-foreground text-center py-6">Aucun log.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════ CONTENT ═══════════════════
function ContentTab() {
  const qc = useQueryClient();
  const list = useServerFn(listAllContent);
  const del = useServerFn(deleteContent);
  const [table, setTable] = useState<"notes" | "bookmarks" | "feed_items" | "todos">("notes");
  const { data = [] } = useQuery({
    queryKey: ["admin", "content", table],
    queryFn: () => list({ data: { table, limit: 100 } }),
    retry: false,
  });
  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <Select value={table} onValueChange={(v) => setTable(v as typeof table)}>
          <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="notes">Notes</SelectItem>
            <SelectItem value="bookmarks">Bookmarks</SelectItem>
            <SelectItem value="feed_items">Veille</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{data.length} items</span>
      </div>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Titre</TableHead><TableHead>Owner</TableHead><TableHead>Créé</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs truncate max-w-md">{r.title ?? "—"}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{r.user_id.slice(0, 8)}…</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => {
                    if (!confirm("Supprimer définitivement ?")) return;
                    del({ data: { table, id: r.id } })
                      .then(() => { toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["admin", "content", table] }); })
                      .catch((e) => toast.error(e instanceof Error ? e.message : String(e)));
                  }}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ═══════════════════ FEATURE FLAGS ═══════════════════
function FlagsTab() {
  const qc = useQueryClient();
  const list = useServerFn(listFeatureFlags);
  const upsert = useServerFn(upsertFeatureFlag);
  const del = useServerFn(deleteFeatureFlag);
  const { data = [] } = useQuery({ queryKey: ["admin", "flags"], queryFn: () => list(), retry: false });

  const [key, setKey] = useState("");
  const [desc, setDesc] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "flags"] });

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Nouveau flag global</div>
        <div className="flex gap-2">
          <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="key (ex: new_ui.beta)" className="h-9" />
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="description (optionnel)" className="h-9" />
          <Button onClick={() => {
            upsert({ data: { key, user_id: null, enabled: false, description: desc || undefined } })
              .then(() => { toast.success("Flag créé"); setKey(""); setDesc(""); refresh(); })
              .catch((e) => toast.error(e instanceof Error ? e.message : String(e)));
          }} disabled={!key}>Créer</Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Key</TableHead><TableHead>Scope</TableHead><TableHead>Description</TableHead><TableHead>Activé</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {data.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono text-xs">{f.key}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px] h-5">{f.user_id ? "user" : "global"}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{f.description ?? "—"}</TableCell>
                <TableCell>
                  <Button size="sm" variant={f.enabled ? "default" : "outline"} className="h-7 text-xs"
                    onClick={() => upsert({ data: { key: f.key, user_id: f.user_id, enabled: !f.enabled, description: f.description ?? undefined } })
                      .then(() => { toast.success("MAJ"); refresh(); }).catch((e) => toast.error(String(e)))}>
                    {f.enabled ? "ON" : "OFF"}
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost"
                    onClick={() => del({ data: { id: f.id } }).then(() => { toast.success("Supprimé"); refresh(); })}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && <TableRow><TableCell colSpan={5} className="text-xs text-muted-foreground text-center py-6">Aucun flag.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ═══════════════════ AUDIT ═══════════════════
function AuditTab() {
  const fn = useServerFn(getAdminActionLogs);
  const { data = [] } = useQuery({ queryKey: ["admin", "audit"], queryFn: () => fn(), retry: false });
  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <p className="text-xs text-muted-foreground flex-1">{data.length} actions admin tracées</p>
        <ExportCsvButton rows={data} filename="admin-audit.csv" />
      </div>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Date</TableHead><TableHead>Acteur</TableHead><TableHead>Action</TableHead><TableHead>Cible</TableHead><TableHead>Détails</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {data.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("fr-FR")}</TableCell>
                <TableCell className="text-xs font-mono">{a.actor_email ?? a.actor_id.slice(0, 8)}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px] h-5">{a.action}</Badge></TableCell>
                <TableCell className="text-xs font-mono">{a.target_email ?? a.target_id ?? "—"}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground max-w-xs truncate">{JSON.stringify(a.details)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ═══════════════════ SYSTEM ═══════════════════
function SystemTab() {
  const fn = useServerFn(getSystemInfo);
  const { data } = useQuery({ queryKey: ["admin", "system"], queryFn: () => fn(), retry: false, refetchInterval: 60_000 });
  if (!data) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Comptes" value={data.totalUsers} />
        <Kpi label="Page views" value={data.totalViews} />
        <Kpi label="Actions admin" value={data.totalAdminActions} />
        <Kpi label="Serveur" value={new Date(data.serverTime).toLocaleTimeString("fr-FR")} />
      </div>
      <div className="rounded-lg border bg-card p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Environnement</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>Service key configurée</div><div className={data.env.hasServiceKey ? "text-green-500" : "text-red-500"}>{data.env.hasServiceKey ? "✓" : "✗"}</div>
          <div>Lovable AI configurée</div><div className={data.env.hasLovableAi ? "text-green-500" : "text-red-500"}>{data.env.hasLovableAi ? "✓" : "✗"}</div>
        </div>
      </div>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <div className="px-4 py-3 border-b text-xs uppercase tracking-wider text-muted-foreground">Cron jobs récents</div>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Job</TableHead><TableHead>Statut</TableHead><TableHead>Démarré</TableHead><TableHead>Message</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {data.cronRuns.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs">{r.jobname}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`h-5 text-[10px] ${
                    r.status === "succeeded" ? "border-green-500/30 text-green-500"
                      : r.status === "failed" ? "border-red-500/30 text-red-500"
                      : "border-amber-500/30 text-amber-500"
                  }`}>{r.status}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(r.start_time).toLocaleString("fr-FR")}</TableCell>
                <TableCell className="text-xs text-muted-foreground truncate max-w-xs">{r.return_message ?? "—"}</TableCell>
              </TableRow>
            ))}
            {data.cronRuns.length === 0 && <TableRow><TableCell colSpan={4} className="text-xs text-muted-foreground text-center py-6">Aucun passage récent.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ═══════════════════ HELPERS ═══════════════════
function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ExportCsvButton<T extends Record<string, unknown>>({ rows, filename }: { rows: T[]; filename: string }) {
  return (
    <Button size="sm" variant="outline" onClick={() => {
      if (rows.length === 0) return;
      const headers = Object.keys(rows[0]);
      const csv = [
        headers.join(","),
        ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    }}>CSV</Button>
  );
}
