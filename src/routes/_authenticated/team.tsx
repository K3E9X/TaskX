import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, User as UserIcon } from "lucide-react";

type TeamRole = "architect" | "pentester" | "forensic" | "analyst";
type AppRole = "admin" | "member";

type Member = {
  id: string;
  display_name: string | null;
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
  component: Page,
});

function Page() {
  const { t } = useI18n();
  const qc = useQueryClient();

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

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team", "members"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, display_name, team_role, avatar_url, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;

      const ids = (profiles ?? []).map((p) => p.id);
      const { data: roles } = await supabase
        .from("user_roles").select("user_id, role").in("user_id", ids);
      const roleMap = new Map<string, AppRole>();
      (roles ?? []).forEach((r) => {
        const cur = roleMap.get(r.user_id);
        if (r.role === "admin" || !cur) roleMap.set(r.user_id, r.role as AppRole);
      });

      return (profiles ?? []).map((p) => ({
        ...p,
        app_role: roleMap.get(p.id) ?? "member",
      })) as Member[];
    },
  });

  const updateTeamRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: TeamRole }) => {
      const { error } = await supabase
        .from("profiles").update({ team_role: role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team", "members"] });
      toast.success("Rôle mis à jour");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const isAdmin = myRole === "admin";

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-8">
      <div className="mb-6 flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("nav.team")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {members.length} membre{members.length > 1 ? "s" : ""}
            {isAdmin && " · tu es admin"}
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">{t("common.empty")}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {members.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              isMe={m.id === me?.id}
              canEdit={isAdmin}
              onChangeRole={(role) => updateTeamRole.mutate({ id: m.id, role })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MemberCard({
  member, isMe, canEdit, onChangeRole,
}: {
  member: Member;
  isMe: boolean;
  canEdit: boolean;
  onChangeRole: (role: TeamRole) => void;
}) {
  const [role, setRole] = useState<TeamRole>(member.team_role);

  return (
    <div className={`rounded-lg border bg-card p-4 ${isMe ? "ring-1 ring-primary/40" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center shrink-0 text-sm font-medium">
          {(member.display_name ?? "??").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{member.display_name ?? "—"}</span>
            {isMe && <Badge variant="outline" className="h-4 text-[9px] px-1.5">moi</Badge>}
            {member.app_role === "admin" && (
              <Badge className="h-4 text-[9px] px-1.5 bg-amber-500/15 text-amber-500 border-amber-500/30 border" variant="outline">
                <Shield className="h-2.5 w-2.5 mr-0.5" /> admin
              </Badge>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            {canEdit ? (
              <Select
                value={role}
                onValueChange={(v) => {
                  const next = v as TeamRole;
                  setRole(next);
                  onChangeRole(next);
                }}
              >
                <SelectTrigger className="h-7 text-xs w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline" className={`h-5 text-[10px] border ${ROLE_COLORS[member.team_role]}`}>
                <UserIcon className="h-2.5 w-2.5 mr-1" /> {member.team_role}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
