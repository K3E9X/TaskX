import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n, LangToggle } from "@/lib/i18n";
import { TaskXMark } from "@/components/brand/TaskXLogo";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — TaskX" },
      {
        name: "description",
        content:
          "Sign in to your TaskX account to access your cybersecurity cockpit: CTI watch, CVE tracking, runbooks and team RBAC.",
      },
      { property: "og:title", content: "Sign in — TaskX" },
      {
        property: "og:description",
        content: "Sign in to your TaskX cybersecurity cockpit.",
      },
      { property: "og:url", content: "https://taskxx.lovable.app/login" },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      { rel: "canonical", href: "https://taskxx.lovable.app/login" },
    ],
  }),
  component: LoginPage,
});

function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.74-6-6.1s2.69-6.1 6-6.1c1.88 0 3.14.8 3.86 1.48l2.63-2.53C16.83 3.42 14.66 2.5 12 2.5 6.76 2.5 2.5 6.76 2.5 12S6.76 21.5 12 21.5c6.93 0 9.5-4.87 9.5-7.32 0-.49-.05-.86-.12-1.23H12z" />
    </svg>
  );
}

function AppleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.46 2.27-1.22 3.07-.81.86-2.14 1.53-3.24 1.44-.14-1.12.42-2.27 1.18-3.07.86-.92 2.3-1.6 3.28-1.44zM20.5 17.07c-.55 1.27-.82 1.84-1.53 2.96-.99 1.56-2.39 3.5-4.12 3.51-1.54.02-1.93-1-4.02-.99-2.09.01-2.52 1.01-4.06.99-1.73-.02-3.05-1.77-4.04-3.33C-.05 15.86-.34 10.95 1.68 8.31c1.43-1.88 3.69-2.98 5.81-2.98 2.16 0 3.52 1.18 5.31 1.18 1.74 0 2.8-1.18 5.3-1.18 1.89 0 3.89 1.03 5.32 2.81-4.67 2.56-3.91 9.24-2.92 8.93z" />
    </svg>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [lastResendAt, setLastResendAt] = useState<number | null>(null);

  const normalizedPendingEmail = useMemo(
    () => pendingEmail?.trim().toLowerCase() ?? "",
    [pendingEmail],
  );

  const resendConfirmation = async (target: string) => {
    const normalizedTarget = target.trim().toLowerCase();
    if (!normalizedTarget) return;
    if (lastResendAt && Date.now() - lastResendAt < 60_000) {
      toast.info(t("auth.verify.wait"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalizedTarget,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
      setLastResendAt(Date.now());
      toast.success(t("auth.verify.resent"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.error"));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const normalizedEmail = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: displayName || normalizedEmail.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          toast.info(t("auth.accountExists"));
          setMode("signin");
          return;
        }
        setPendingEmail(normalizedEmail);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) {
          const msg = error.message?.toLowerCase() ?? "";
          if (msg.includes("not confirmed") || msg.includes("email_not_confirmed")) {
            setPendingEmail(email);
            toast.error(t("auth.notConfirmed"));
            return;
          }
          throw error;
        }
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal && aal.currentLevel !== aal.nextLevel) {
          navigate({ to: "/mfa-challenge" });
        } else {
          navigate({ to: "/dashboard" });
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.error"));
    } finally {
      setLoading(false);
    }
  };

  const onOAuth = async (provider: "google" | "apple") => {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (res.error) {
      toast.error(res.error.message || t(provider === "google" ? "auth.googleError" : "auth.appleError"));
      setLoading(false);
      return;
    }
    if (res.redirected) return;
    navigate({ to: "/dashboard" });
  };

  if (pendingEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 relative">
        <div className="absolute top-4 right-4"><LangToggle /></div>
        <div className="w-full max-w-sm text-center">
          <Link to="/" aria-label="TaskX home" className="flex justify-center"><TaskXMark size={44} /></Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">{t("auth.verify.title")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("auth.verify.body")} <span className="font-medium text-foreground">{pendingEmail}</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{t("auth.verify.hint")}</p>
          <div className="mt-6 space-y-2">
            <Button onClick={() => resendConfirmation(normalizedPendingEmail)} disabled={loading} className="w-full">
              {t("auth.verify.resend")}
            </Button>
            <Button variant="ghost" onClick={() => { setPendingEmail(null); setMode("signin"); }} className="w-full">
              {t("auth.verify.back")}
            </Button>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative">
      <div className="absolute top-4 right-4"><LangToggle /></div>
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Link to="/" aria-label="TaskX home" className="flex justify-center"><TaskXMark size={44} /></Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight flex items-baseline justify-center">
            <span>Sign in to Task</span>
            <span className="ml-[1px] bg-gradient-to-br from-[oklch(0.88_0.14_195)] to-[oklch(0.72_0.15_195)] bg-clip-text text-transparent font-bold">X</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("app.tagline")}</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="mb-5 flex gap-1 text-sm">
            <button type="button" onClick={() => setMode("signin")}
              className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${mode === "signin" ? "bg-accent" : "hover:bg-accent/50 text-muted-foreground"}`}
            >{t("auth.signin")}</button>
            <button type="button" onClick={() => setMode("signup")}
              className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${mode === "signup" ? "bg-accent" : "hover:bg-accent/50 text-muted-foreground"}`}
            >{t("auth.signup")}</button>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">{t("auth.name")}</Label>
                <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("auth.namePh")} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("auth.password")}</Label>
                {mode === "signin" && (
                  <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
                    {t("auth.forgot")}
                  </Link>
                )}
              </div>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {mode === "signin" ? t("auth.signinBtn") : t("auth.signupBtn")}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> {t("auth.or")} <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            <Button type="button" variant="outline" disabled={loading} onClick={() => onOAuth("google")} className="w-full gap-2">
              <GoogleIcon className="size-4" />
              {t("auth.google")}
            </Button>
            <Button type="button" variant="outline" disabled={loading} onClick={() => onOAuth("apple")} className="w-full gap-2">
              <AppleIcon className="size-4" />
              {t("auth.apple")}
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">{t("auth.back")}</Link>
        </p>
      </div>
    </div>
  );
}
