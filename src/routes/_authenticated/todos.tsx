import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/todos")({
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
      <h1 className="text-2xl font-semibold tracking-tight capitalize">todos</h1>
      <p className="mt-2 text-sm text-muted-foreground">À venir dans le prochain lot.</p>
    </div>
  );
}
