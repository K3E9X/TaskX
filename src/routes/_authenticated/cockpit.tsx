import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/cockpit")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
