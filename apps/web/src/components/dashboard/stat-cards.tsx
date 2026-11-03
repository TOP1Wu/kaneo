import { useTranslation } from "react-i18next";
import type { Dashboard } from "@/fetchers/dashboard/get-dashboard";
import { cn } from "@/lib/cn";
import { getStatusDisplayLabel } from "@/lib/i18n/domain";

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="flex min-w-32 flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span
        className={cn("font-semibold text-2xl tabular-nums", value > 0 && tone)}
      >
        {value}
      </span>
    </div>
  );
}

export function StatCards({ totals }: { totals: Dashboard["totals"] }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={t("workspace:dashboard.totals.tasks")}
          value={totals.tasks}
        />
        <StatCard
          label={t("workspace:dashboard.totals.overdue")}
          value={totals.overdue}
          tone="text-due-overdue"
        />
        <StatCard
          label={t("workspace:dashboard.totals.readyForReview")}
          value={totals.readyForReview}
          tone="text-success-foreground"
        />
        <StatCard
          label={t("workspace:dashboard.totals.stuck")}
          value={totals.stuck}
          tone="text-destructive-foreground"
        />
      </div>
      {totals.byStatus.length > 0 && (
        <ul
          aria-label={t("workspace:dashboard.totals.byStatus")}
          className="flex flex-wrap gap-2"
        >
          {totals.byStatus.map((entry) => (
            <li
              key={entry.status}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
            >
              <span className="text-muted-foreground">
                {getStatusDisplayLabel(entry.status, entry.statusName)}
              </span>
              <span className="font-medium tabular-nums">{entry.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
