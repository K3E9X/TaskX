import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({ meta: [{ title: "Security — TaskX" }] }),
  component: SecurityPage,
});

type TotpFactor = {
  id: string;
  friendly_name?: string | null;
  status: "verified" | "unverified";
  factor_type: string;
  created_at: string;
};

type Enrollment = {
  factorId: string;
  qr: string; // svg data url
  secret: string;
};

function SecurityPage() {
  const { t } = useI18n();
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) toast.error(error.message);
    setFactors((data?.totp ?? []) as TotpFactor[]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const startEnroll = async () => {
    setBusy(true);
    try {
      // Clean any leftover unverified factor first
      const { data: list } = await supabase.auth.mfa.listFactors();
      const stale = (list?.totp ?? []).find((f) => (f.status as string) === "unverified");
      if (stale) await supabase.auth.mfa.unenroll({ factorId: stale.id });

      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setEnrolling({
        factorId: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setCode("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const verifyEnroll = async () => {
    if (!enrolling) return;
    setBusy(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enrolling.factorId });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: enrolling.factorId,
        challengeId: ch.id,
        code: code.trim(),
      });
      if (vErr) throw vErr;
      toast.success(t("security.enabledToast"));
      setEnrolling(null);
      setCode("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Code invalide");
    } finally {
      setBusy(false);
    }
  };

  const cancelEnroll = async () => {
    if (!enrolling) return;
    await supabase.auth.mfa.unenroll({ factorId: enrolling.factorId });
    setEnrolling(null);
    setCode("");
    await refresh();
  };

  const disable = async (factorId: string) => {
    if (!confirm(t("security.disableConfirm"))) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) toast.error(error.message);
    else toast.success(t("security.disabledToast"));
    setBusy(false);
    await refresh();
  };

  const verified = factors.filter((f) => f.status === "verified");
  const active = verified.length > 0;

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("security.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("security.subtitle")}</p>
      </header>

      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
            {active ? <ShieldCheck className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold">{t("security.mfaTitle")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {active ? t("security.mfaOn") : t("security.mfaOff")}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}
          </div>
        ) : enrolling ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm">{t("security.scanHint")}</p>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="rounded-md border bg-white p-3" dangerouslySetInnerHTML={{ __html: enrolling.qr }} />
              <div className="flex-1 text-xs space-y-2">
                <div className="text-muted-foreground">{t("security.manualKey")}</div>
                <code className="block break-all rounded bg-muted px-2 py-1.5 font-mono text-[11px]">{enrolling.secret}</code>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="otp">{t("security.codePh")}</Label>
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={verifyEnroll} disabled={busy || code.length < 6}>
                {t("security.verifyEnable")}
              </Button>
              <Button variant="ghost" onClick={cancelEnroll} disabled={busy}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        ) : active ? (
          <div className="mt-5 space-y-3">
            {verified.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{f.friendly_name || "Authenticator"}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {t("security.addedOn")} {new Date(f.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => disable(f.id)} disabled={busy}>
                  {t("security.disable")}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <Button onClick={startEnroll} disabled={busy}>{t("security.enable")}</Button>
          </div>
        )}
      </section>

      <p className="mt-4 text-xs text-muted-foreground">{t("security.note")}</p>
    </div>
  );
}
