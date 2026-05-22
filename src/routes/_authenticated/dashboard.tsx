import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vue d'ensemble de ton activité sécurité.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Section title="Tâches en retard"><div className="text-3xl font-semibold">—</div></Section>
        <Section title="Risques ouverts"><div className="text-3xl font-semibold">—</div></Section>
        <Section title="Projets actifs"><div className="text-3xl font-semibold">—</div></Section>
        <Section title="CVE critiques (7j)"><div className="text-3xl font-semibold">—</div></Section>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Section title="Tip Linux du jour">
          <p className="text-sm text-muted-foreground">À venir — banque de commandes & techniques.</p>
        </Section>
        <Section title="Dernière veille">
          <p className="text-sm text-muted-foreground">À venir — flux CVE / CTI / X.</p>
        </Section>
      </div>

      <div className="mt-8 rounded-lg border border-dashed bg-muted/30 p-5 text-sm text-muted-foreground">
        Lot 1 livré : authentification, équipe, layout. Les sections (To-do, Notes, Projets, Veille…) arrivent ensuite.
      </div>
    </div>
  );
}
