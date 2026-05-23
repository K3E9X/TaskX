import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getStreakAndActivity } from "@/lib/activity.functions";
import { Flame } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function StreakBadge() {
  const { t } = useI18n();
  const fetch = useServerFn(getStreakAndActivity);
  const { data } = useQuery({
    queryKey: ["streak"],
    queryFn: () => fetch(),
    staleTime: 1000 * 60 * 30,
  });

  const streak = data?.streak ?? 0;
  if (streak === 0) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs font-medium tabular-nums"
            aria-label={`${streak} ${t("streak.label")}`}
          >
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            <span>{streak}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{streak} {t("streak.label")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
