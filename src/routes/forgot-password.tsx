import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TaskXMark } from "@/components/brand/TaskXLogo";
import { useI18n, LangToggle } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — TaskX" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success(t("auth.fp.sent"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative">
      <div className="absolute top-4 right-4"><LangToggle /></div>
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="flex justify-center"><TaskXMark size={44} /></div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t("auth.fp.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("auth.fp.sub")}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          {sent ? (
            <p className="text-sm text-muted-foreground text-center">{t("auth.fp.check")}</p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {t("auth.fp.send")}
              </Button>
            </form>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/login" className="hover:underline">{t("auth.fp.back")}</Link>
        </p>
      </div>
    </div>
  );
}
