import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { TaskXMark } from "@/components/brand/TaskXLogo";
import { toast } from "sonner";

export const Route = createFileRoute("/mfa-challenge")({
  head: () => ({
    meta: [
      { title: "Two-factor verification — TaskX" },
      {
        name: "description",
        content:
          "Enter your authenticator code to complete two-factor verification and access your TaskX cockpit.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MfaChallengePage,
});

function MfaChallengePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/login" });
        return;
      }
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === aal?.nextLevel) {
        navigate({ to: "/dashboard" });
        return;
      }
      const { data: list, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        toast.error(error.message);
        return;
      }
      const f = (list?.totp ?? []).find((x) => x.status === "verified");
      if (!f) {
        navigate({ to: "/dashboard" });
        return;
      }
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: f.id });
      if (chErr) {
        toast.error(chErr.message);
        return;
      }
      setFactorId(f.id);
      setChallengeId(ch.id);
      setReady(true);
    })();
  }, [navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!factorId || !challengeId) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code: code.trim() });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      setCode("");
      // refresh challenge
      const { data: ch } = await supabase.auth.mfa.challenge({ factorId });
      if (ch) setChallengeId(ch.id);
      return;
    }
    navigate({ to: "/dashboard" });
  };

  const cancel = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center"><TaskXMark size={40} /></div>
          <h1 className="mt-3 text-xl font-semibold tracking-tight">{t("security.challengeTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("security.challengeSub")}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="otp">{t("security.codePh")}</Label>
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                disabled={!ready}
              />
            </div>
            <Button type="submit" disabled={!ready || busy || code.length < 6} className="w-full">
              {t("security.verify")}
            </Button>
            <Button type="button" variant="ghost" onClick={cancel} className="w-full">
              {t("common.cancel")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
