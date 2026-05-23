import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Shield, Network, Activity, Search, Crown, User } from "lucide-react";

type Role = "pentester" | "architect" | "soc" | "forensic" | "ciso" | "other";

const ROLES: { id: Role; icon: typeof Shield; key: string }[] = [
  { id: "pentester", icon: Shield, key: "onb.role.pentester" },
  { id: "architect", icon: Network, key: "onb.role.architect" },
  { id: "soc", icon: Activity, key: "onb.role.soc" },
  { id: "forensic", icon: Search, key: "onb.role.forensic" },
  { id: "ciso", icon: Crown, key: "onb.role.ciso" },
  { id: "other", icon: User, key: "onb.role.other" },
];

// team_role column accepts existing enum values; map "soc" / "forensic" / "ciso" / "other" → "architect" fallback if needed
const ROLE_DB_MAP: Record<Role, string> = {
  pentester: "pentester",
  architect: "architect",
  soc: "architect",
  forensic: "architect",
  ciso: "architect",
  other: "architect",
};

export function OnboardingDialog() {
  const { session } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("architect");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.user.id) return;
    supabase.from("profiles").select("onboarded,team_role").eq("id", session.user.id).maybeSingle()
      .then(({ data }) => {
        if (data && data.onboarded === false) {
          setOpen(true);
          if (data.team_role) setRole(data.team_role as Role);
        }
      });
  }, [session?.user.id]);

  const finish = async () => {
    if (!session?.user.id) return;
    setSaving(true);
    try {
      const { PRESET_BY_ROLE } = await import("@/lib/note-templates");
      await supabase.from("profiles").update({
        onboarded: true,
        team_role: ROLE_DB_MAP[role] as never,
        dashboard_widgets: PRESET_BY_ROLE[role] ?? PRESET_BY_ROLE.other,
      }).eq("id", session.user.id);
      toast.success(t("onb.done"));
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("onb.title")}</DialogTitle>
          <DialogDescription>{t("onb.subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 my-2">
          {ROLES.map((r) => {
            const Icon = r.icon;
            const active = role === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`flex items-center gap-2 rounded-md border p-3 text-sm transition-colors ${
                  active ? "border-primary bg-primary/5" : "hover:bg-accent/40"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <span>{t(r.key as never)}</span>
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>{t("onb.skip")}</Button>
          <Button onClick={finish} disabled={saving}>{t("onb.continue")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
