import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/bookmarks")({
  component: Page,
});

function Page() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t("nav.bookmarks")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("common.soon")}</p>
    </div>
  );
}
