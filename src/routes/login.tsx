import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Compte créé. Vérifie ta boîte mail pour confirmer.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'authentification");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) {
      toast.error(res.error.message || "Erreur Google");
      setLoading(false);
      return;
    }
    if (res.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">SecDesk</h1>
          <p className="mt-2 text-sm text-muted-foreground">Plateforme équipe sécurité</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="mb-5 flex gap-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${mode === "signin" ? "bg-accent" : "hover:bg-accent/50 text-muted-foreground"}`}
            >Connexion</button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${mode === "signup" ? "bg-accent" : "hover:bg-accent/50 text-muted-foreground"}`}
            >Créer un compte</button>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nom</Label>
                <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ton nom" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {mode === "signin" ? "Se connecter" : "Créer le compte"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="outline" disabled={loading} onClick={onGoogle} className="w-full">
            Continuer avec Google
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">Retour</Link>
        </p>
      </div>
    </div>
  );
}
