import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";

const VAR_RE = /\{\{\s*([A-Z0-9_]+)\s*\}\}/g;

export function extractVars(text: string): string[] {
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(VAR_RE.source, "g");
  while ((m = re.exec(text)) !== null) set.add(m[1]);
  return Array.from(set);
}

export function fillVars(text: string, values: Record<string, string>): string {
  return text.replace(VAR_RE, (_, name: string) => values[name] ?? `{{${name}}}`);
}

export function SnippetVarsDialog({
  open, onOpenChange, command,
}: { open: boolean; onOpenChange: (v: boolean) => void; command: string }) {
  const vars = useMemo(() => extractVars(command), [command]);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) setValues(Object.fromEntries(vars.map((v) => [v, ""])));
  }, [open, vars.join("|")]);

  const filled = fillVars(command, values);
  const missing = vars.filter((v) => !values[v]?.trim());

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(filled);
      toast.success("Snippet copié");
      onOpenChange(false);
    } catch {
      toast.error("Clipboard error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Remplir les variables
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {vars.map((v) => (
            <div key={v} className="space-y-1">
              <label className="text-xs font-mono text-muted-foreground">{`{{${v}}}`}</label>
              <Input
                autoFocus={v === vars[0]}
                value={values[v] ?? ""}
                onChange={(e) => setValues((s) => ({ ...s, [v]: e.target.value }))}
                placeholder={v.toLowerCase()}
                className="h-8 font-mono text-xs"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Prévisualisation</label>
            <pre className="text-xs font-mono bg-muted/40 border rounded p-2 whitespace-pre-wrap break-all max-h-40 overflow-auto">
              {filled}
            </pre>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={doCopy} disabled={missing.length > 0} className="gap-2">
            <Copy className="h-3.5 w-3.5" /> Copier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
