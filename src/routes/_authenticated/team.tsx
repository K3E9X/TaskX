import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, User as UserIcon, Mail, Calendar, Pencil, Check, X } from "lucide-react";
import { listTeamMembers, setAppRole, updateMemberProfile } from "@/lib/team.functions";

type TeamRole = "architect" | "pentester" | "forensic" | "analyst";
type AppRole = "admin" | "member";

type Member = {
  id: string;
  email: string;
  display_name: string;
  first_name: string;
  last_name: string;
  team_role: TeamRole;
  avatar_url: string | null;
  created_at: string;
  app_role: AppRole;
};

const TEAM_ROLES: TeamRole[] = ["architect", "pentester", "forensic", "analyst"];

const ROLE_COLORS: Record<TeamRole, string> = {
  architect: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  pentester: "bg-red-500/15 text-red-500 border-red-500/30",
  forensic: "bg-purple-500/15 text-purple-500 border-purple-500/30",
  analyst: "bg-green-500/15 text-green-500 border-green-500/30",
};

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [{ title: "Team — TaskX" }] }),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  const qc = useQueryClient();

  const list = useServerFn(listTeamMembers);
  const updRole = useServerFn(setAppRole);
  const updProfile = useServerFn(updateMemberProfile);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: myRole } = useQuery({
    queryKey: ["myAppRole", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles").select("role").eq("user_id", me!.id);
      return (data ?? []).some((r) => r.role === "admin") ? "admin" : "member";
    },
  });

  const isAdmin = myRole === "admin";

  const { data: members = [], isLoading, error } = useQuery({
    queryKey: ["team", "members", "admin"],
    enabled: isAdmin,
    queryFn: () => list() as Promise<Member[]>,
  });

  const setRoleMut = useMutation({
    mutationFn: (vars: { userId: string; role: AppRole }) =>
      updRole({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team", "members", "admin"] });
      toast.success("Rôle mis à jour");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { userId: string; first_name?: string; last_name?: string; team_role?: TeamRole }) =>
      updProfile({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team", "members", "admin"] });
      toast.success("Profil mis à jour");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-8">
      <div className="mb-6 flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("nav.team")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {members.length} membre{members.length > 1 ? "s" : ""}
            {isAdmin ? " · tu es admin" : " · accès limité"}
          </p>
        </div>
      </div>

      {!isAdmin ? (
        <div className="rounded-lg border bg-card p-6 text-center">
          <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Réservé aux admins. Seul un admin peut voir la liste complète des comptes.
          </p>
        </div>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">{t("common.empty")}</p>
      ) : (
        <div className="grid gap-3">
          {members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              isMe={m.id === me?.id}
              onChangeAppRole={(role) => setRoleMut.mutate({ userId: m.id, role })}
              onSaveProfile={(patch) => updateMut.mutate({ userId: m.id, ...patch })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MemberRow({
  member, isMe, onChangeAppRole, onSaveProfile,
}: {
  member: Member;
  isMe: boolean;
  onChangeAppRole: (role: AppRole) => void;
  onSaveProfile: (p: { first_name?: string; last_name?: string; team_role?: TeamRole }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(member.first_name);
  const [lastName, setLastName] = useState(member.last_name);
  const [teamRole, setTeamRole] = useState<TeamRole>(member.team_role);

  const createdDate = new Date(member.created_at).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div className={`rounded-lg border bg-card p-4 ${isMe ? "ring-1 ring-primary/40" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center shrink-0 text-sm font-medium">
          {(member.display_name || member.email).slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          {/* Header line */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">
              {[member.first_name, member.last_name].filter(Boolean).join(" ") || member.display_name || "—"}
            </span>
            {isMe && <Badge variant="outline" className="h-4 text-[9px] px-1.5">moi</Badge>}
            {member.app_role === "admin" && (
              <Badge className="h-4 text-[9px] px-1.5 bg-amber-500/15 text-amber-500 border-amber-500/30 border" variant="outline">
                <Shield className="h-2.5 w-2.5 mr-0.5" /> admin
              </Badge>
            )}
            <Badge variant="outline" className={`h-5 text-[10px] border ${ROLE_COLORS[member.team_role]}`}>
              <UserIcon className="h-2.5 w-2.5 mr-1" /> {member.team_role}
            </Badge>
          </div>

          {/* Meta */}
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{member.email}</span>
            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />créé le {createdDate}</span>
          </div>

          {/* Edit zone */}
          {editing ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Input
                placeholder="Prénom" value={firstName}
                onChange={(e) => setFirstName(e.target.value)} className="h-8 text-xs"
              />
              <Input
                placeholder="Nom" value={lastName}
                onChange={(e) => setLastName(e.target.value)} className="h-8 text-xs"
              />
              <Select value={teamRole} onValueChange={(v) => setTeamRole(v as TeamRole)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEAM_ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="sm:col-span-3 flex items-center gap-2">
                <Button
                  size="sm" className="h-7 text-xs"
                  onClick={() => {
                    onSaveProfile({ first_name: firstName, last_name: lastName, team_role: teamRole });
                    setEditing(false);
                  }}
                >
                  <Check className="h-3 w-3 mr-1" /> Enregistrer
                </Button>
                <Button
                  size="sm" variant="ghost" className="h-7 text-xs"
                  onClick={() => {
                    setFirstName(member.first_name);
                    setLastName(member.last_name);
                    setTeamRole(member.team_role);
                    setEditing(false);
                  }}
                >
                  <X className="h-3 w-3 mr-1" /> Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Select
                value={member.app_role}
                onValueChange={(v) => onChangeAppRole(v as AppRole)}
              >
                <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member" className="text-xs">member</SelectItem>
                  <SelectItem value="admin" className="text-xs">admin</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(true)}>
                <Pencil className="h-3 w-3 mr-1" /> Éditer
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
