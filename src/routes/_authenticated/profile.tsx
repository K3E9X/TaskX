import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { deleteMyAccount } from "@/lib/account.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { UserCircle2, Mail, KeyRound, Trash2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { session, signOut } = useAuth();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const fr = lang === "fr";
  const userEmail = session?.user.email ?? "";

  // Display name
  const [displayName, setDisplayName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingName, setSavingName] = useState(false);

  // Email
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const deleteFn = useServerFn(deleteMyAccount);

  useEffect(() => {
    supabase.from("profiles").select("display_name").maybeSingle().then(({ data }) => {
      setDisplayName((data?.display_name as string | null) ?? "");
      setLoadingProfile(false);
    });
  }, []);

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() || null })
        .eq("id", session.user.id);
      if (error) throw error;
      await supabase.auth.updateUser({ data: { display_name: displayName.trim() } });
      toast.success(fr ? "Pseudo mis à jour" : "Display name updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSavingName(false);
    }
  };

  const saveEmail = async (e: FormEvent) => {
    e.preventDefault();
    const target = newEmail.trim();
    if (!target || target === userEmail) return;
    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { email: target },
        { emailRedirectTo: window.location.origin + "/profile" },
      );
      if (error) throw error;
      toast.success(fr
        ? "Email de confirmation envoyé. Vérifie tes deux boîtes (ancienne et nouvelle)."
        : "Confirmation email sent. Check both your old and new mailboxes.");
      setNewEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSavingEmail(false);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 10) {
      toast.error(fr ? "Min. 10 caractères" : "Min. 10 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(fr ? "Les mots de passe ne correspondent pas" : "Passwords don't match");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(fr ? "Mot de passe mis à jour" : "Password updated");
      setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteFn();
      await signOut();
      toast.success(fr ? "Compte supprimé" : "Account deleted");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
      setDeleting(false);
    }
  };

  const expectedConfirm = fr ? "SUPPRIMER" : "DELETE";

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-8 space-y-6">
      <header className="flex items-center gap-3">
        <UserCircle2 className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {fr ? "Mon profil" : "My profile"}
          </h1>
          <p className="text-xs text-muted-foreground">{userEmail}</p>
        </div>
      </header>

      {/* Display name */}
      <section className="rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold mb-1">{fr ? "Pseudo" : "Display name"}</h2>
        <p className="text-xs text-muted-foreground mb-3">
          {fr ? "Ce nom apparaît dans la barre latérale et tes contenus." : "Shown in the sidebar and your content."}
        </p>
        <form onSubmit={saveName} className="space-y-3">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={fr ? "Ton pseudo" : "Your display name"}
            maxLength={60}
            disabled={loadingProfile}
          />
          <Button type="submit" disabled={savingName || loadingProfile} size="sm">
            {savingName && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {fr ? "Enregistrer" : "Save"}
          </Button>
        </form>
      </section>

      {/* Email */}
      <section className="rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          {fr ? "Adresse email" : "Email address"}
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          {fr
            ? "Un email de confirmation sera envoyé à la nouvelle adresse. Le changement prend effet après validation."
            : "A confirmation email will be sent to the new address. The change applies after verification."}
        </p>
        <form onSubmit={saveEmail} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="current-email" className="text-xs text-muted-foreground">
              {fr ? "Email actuel" : "Current email"}
            </Label>
            <Input id="current-email" value={userEmail} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-email">{fr ? "Nouvel email" : "New email"}</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@example.com"
            />
          </div>
          <Button type="submit" disabled={savingEmail || !newEmail || newEmail === userEmail} size="sm">
            {savingEmail && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {fr ? "Envoyer la confirmation" : "Send confirmation"}
          </Button>
        </form>
      </section>

      {/* Password */}
      <section className="rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          {fr ? "Mot de passe" : "Password"}
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          {fr ? "Minimum 10 caractères." : "Minimum 10 characters."}
        </p>
        <form onSubmit={savePassword} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-pwd">{fr ? "Nouveau mot de passe" : "New password"}</Label>
            <Input
              id="new-pwd"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={10}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pwd">{fr ? "Confirmation" : "Confirm"}</Label>
            <Input
              id="confirm-pwd"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={10}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={savingPassword || !newPassword || !confirmPassword} size="sm">
            {savingPassword && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {fr ? "Mettre à jour" : "Update"}
          </Button>
        </form>
      </section>

      {/* Delete account */}
      <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-5">
        <h2 className="text-sm font-semibold mb-1 flex items-center gap-2 text-destructive">
          <Trash2 className="h-4 w-4" />
          {fr ? "Supprimer mon compte" : "Delete my account"}
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          {fr
            ? "Action irréversible. Toutes tes données (todos, notes, runbooks, projets, veille, etc.) seront définitivement supprimées."
            : "Irreversible. All your data (todos, notes, runbooks, projects, watch, etc.) will be permanently deleted."}
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {fr ? "Supprimer mon compte" : "Delete my account"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {fr ? "Confirmer la suppression" : "Confirm deletion"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {fr
                  ? `Tape ${expectedConfirm} pour confirmer. Cette action est définitive.`
                  : `Type ${expectedConfirm} to confirm. This action is permanent.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={expectedConfirm}
              autoFocus
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirm("")} disabled={deleting}>
                {fr ? "Annuler" : "Cancel"}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteConfirm !== expectedConfirm || deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {fr ? "Supprimer définitivement" : "Delete permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
