import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { SendDigestButton } from "@/components/SendDigestButton";

type Status = "checking" | "connected" | "disconnected";

export function OutlookConnectCard() {
  const [status, setStatus] = useState<Status>("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  async function check() {
    setStatus("checking");
    try {
      const res = await fetch("/api/public/hooks/daily-digest/status");
      if (!res.ok) {
        setStatus("disconnected");
        return;
      }
      const data = (await res.json()) as { connected: boolean; email?: string };
      if (data.connected && data.email) {
        setEmail(data.email);
        setStatus("connected");
      } else {
        setStatus("disconnected");
      }
    } catch {
      setStatus("disconnected");
    }
  }

  useEffect(() => {
    check();
  }, []);

  async function testConnection() {
    setTesting(true);
    await check();
    setTesting(false);
    if (status === "connected") toast.success("Connexion Outlook vérifiée");
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-md bg-accent flex items-center justify-center shrink-0">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">Microsoft Outlook</h3>
            {status === "checking" && (
              <Badge variant="outline" className="h-5 text-[10px]">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Vérification…
              </Badge>
            )}
            {status === "connected" && (
              <Badge className="h-5 text-[10px] bg-green-600 hover:bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Connecté
              </Badge>
            )}
            {status === "disconnected" && (
              <Badge variant="destructive" className="h-5 text-[10px]">
                <XCircle className="h-3 w-3 mr-1" /> Non connecté
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {status === "connected" && email
              ? `Connecté en tant que ${email} — digests envoyés à 11h et 15h.`
              : "Connecte ton compte Outlook pour recevoir les digests quotidiens (todos + alertes CVE)."}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button onClick={testConnection} disabled={testing || status === "checking"} variant="outline" size="sm">
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {status === "connected" ? "Vérifier" : "Connecter Outlook"}
            </Button>
            {status === "connected" && <SendDigestButton />}
          </div>
          {status === "disconnected" && (
            <p className="text-[11px] text-muted-foreground mt-2">
              La connexion Outlook est gérée au niveau de l'espace de travail. Si tu vois "Non connecté", contacte l'admin pour relier le compte Outlook.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
