import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function SendDigestButton() {
  const [loading, setLoading] = useState(false);

  async function send() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Non connecté");
        return;
      }
      const res = await fetch("/api/public/hooks/daily-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(`Échec: ${data.error || res.statusText}`);
        return;
      }
      const r = data.results?.[0];
      if (r?.sent) {
        toast.success(`Digest envoyé à ${data.recipient} (${r.todos} todos, ${r.cves} CVE)`);
      } else {
        toast.message(r?.error || "Rien à envoyer");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={send} disabled={loading} variant="outline" size="sm">
      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
      Envoyer le digest
    </Button>
  );
}
