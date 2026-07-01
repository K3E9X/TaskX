import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import {
  Shield, Network, Activity, Search, Crown, User,
  Layers, Rss, Terminal, Sparkles, ArrowRight, ArrowLeft, Check,
} from "lucide-react";

type Role = "pentester" | "architect" | "soc" | "forensic" | "ciso" | "other";

const ROLES: { id: Role; icon: typeof Shield; key: string }[] = [
  { id: "pentester", icon: Shield, key: "onb.role.pentester" },
  { id: "architect", icon: Network, key: "onb.role.architect" },
  { id: "soc", icon: Activity, key: "onb.role.soc" },
  { id: "forensic", icon: Search, key: "onb.role.forensic" },
  { id: "ciso", icon: Crown, key: "onb.role.ciso" },
  { id: "other", icon: User, key: "onb.role.other" },
];

const PROFILE_TYPE_MAP: Partial<Record<Role, "pentester" | "architect" | "soc" | "forensic" | "ciso">> = {
  pentester: "pentester",
  architect: "architect",
  soc: "soc",
  forensic: "forensic",
  ciso: "ciso",
};

type TourStep = {
  icon: typeof Layers;
  titleKey: "onb.stack.title" | "onb.feed.title" | "onb.snippet.title" | "onb.ai.title";
  descKey: "onb.stack.desc" | "onb.feed.desc" | "onb.snippet.desc" | "onb.ai.desc";
  to: "/stack" | "/feeds" | "/snippets" | "/dashboard";
  accent: string;
};

const TOUR: TourStep[] = [
  { icon: Layers, titleKey: "onb.stack.title", descKey: "onb.stack.desc", to: "/stack", accent: "from-cyan-500/20 to-cyan-500/5" },
  { icon: Rss, titleKey: "onb.feed.title", descKey: "onb.feed.desc", to: "/feeds", accent: "from-sky-500/20 to-sky-500/5" },
  { icon: Terminal, titleKey: "onb.snippet.title", descKey: "onb.snippet.desc", to: "/snippets", accent: "from-emerald-500/20 to-emerald-500/5" },
  { icon: Sparkles, titleKey: "onb.ai.title", descKey: "onb.ai.desc", to: "/dashboard", accent: "from-fuchsia-500/20 to-fuchsia-500/5" },
];

const TOTAL_STEPS = 1 + TOUR.length; // role picker + 4 tour steps

export function OnboardingDialog() {
  const { session } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("architect");
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.user.id) return;
    supabase.from("profiles").select("onboarded,profile_type").eq("id", session.user.id).maybeSingle()
      .then(({ data }) => {
        if (data && data.onboarded === false) {
          setOpen(true);
          if (data.profile_type) setRole(data.profile_type as Role);
        }
      });
  }, [session?.user.id]);

  const finish = async (closeAfter = true) => {
    if (!session?.user.id) return;
    setSaving(true);
    try {
      const { PRESET_BY_ROLE } = await import("@/lib/note-templates");
      await supabase.from("profiles").update({
        onboarded: true,
        profile_type: PROFILE_TYPE_MAP[role] ?? null,
        dashboard_widgets: PRESET_BY_ROLE[role] ?? PRESET_BY_ROLE.other,
      }).eq("id", session.user.id);
      if (closeAfter) {
        toast.success(t("onb.done"));
        setOpen(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const isRoleStep = step === 0;
  const tour = !isRoleStep ? TOUR[step - 1] : null;
  const isLast = step === TOTAL_STEPS - 1;

  const next = async () => {
    if (isLast) {
      await finish(true);
      return;
    }
    setStep((s) => s + 1);
  };

  const skip = async () => {
    // Persist role choice + mark onboarded so we don't nag again
    await finish(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) skip(); }}>
      <DialogContent className="sm:max-w-lg overflow-hidden p-0">
        {/* Progress bar */}
        <div className="h-1 w-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-sky-500 transition-all"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        <div className="p-6">
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono uppercase tracking-wider">
              {t("onb.step")} {step + 1} {t("onb.of")} {TOTAL_STEPS}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-muted-foreground/30"}`}
                />
              ))}
            </div>
          </div>

          {isRoleStep ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("onb.title")}</DialogTitle>
                <DialogDescription>{t("onb.subtitle")}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2 my-4">
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
            </>
          ) : tour ? (
            <>
              <div className={`mb-4 rounded-lg border bg-gradient-to-br ${tour.accent} p-6`}>
                <tour.icon className="h-10 w-10 text-primary" strokeWidth={1.5} />
              </div>
              <DialogHeader>
                <DialogTitle>{t(tour.titleKey)}</DialogTitle>
                <DialogDescription className="pt-1 leading-relaxed">
                  {t(tour.descKey)}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <Button asChild variant="outline" size="sm" onClick={() => finish(false)}>
                  <Link to={tour.to} onClick={() => setOpen(false)}>
                    {t("onb.open")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={skip}>
              {t("onb.skip")}
            </Button>
            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" /> {t("onb.back")}
                </Button>
              )}
              <Button size="sm" onClick={next} disabled={saving}>
                {isLast ? (
                  <>
                    <Check className="mr-1 h-3.5 w-3.5" /> {t("onb.finish")}
                  </>
                ) : (
                  <>
                    {t("onb.next")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
