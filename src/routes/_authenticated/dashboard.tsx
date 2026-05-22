import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t("dash.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("dash.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Section title={t("dash.kpi.overdue")}><div className="text-3xl font-semibold">—</div></Section>
        <Section title={t("dash.kpi.risks")}><div className="text-3xl font-semibold">—</div></Section>
        <Section title={t("dash.kpi.projects")}><div className="text-3xl font-semibold">—</div></Section>
        <Section title={t("dash.kpi.cve")}><div className="text-3xl font-semibold">—</div></Section>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Section title={t("dash.tip")}>
          <p className="text-sm text-muted-foreground">{t("dash.tipSoon")}</p>
        </Section>
        <Section title={t("dash.feed")}>
          <p className="text-sm text-muted-foreground">{t("dash.feedSoon")}</p>
        </Section>
      </div>

      <div className="mt-8 rounded-lg border border-dashed bg-muted/30 p-5 text-sm text-muted-foreground">
        {t("dash.lot1")}
      </div>
    </div>
  );
}
