import { useTranslation } from "react-i18next";
import type { Dashboard } from "@/fetchers/dashboard/get-dashboard";
import { ChartCard } from "./chart-card";
import { percent } from "./chart-helpers";

const SEGMENTS = [
  { key: "done", className: "bg-success" },
  { key: "doing", className: "bg-info" },
  { key: "todo", className: "bg-muted-foreground/30" },
] as const;

/** One horizontal stacked bar per person, scaled to the busiest person. */
export function WorkloadChart({
  workload,
}: {
  workload: Dashboard["workload"];
}) {
  const { t } = useTranslation();
  const max = Math.max(
    1,
    ...workload.map((row) => row.todo + row.doing + row.done),
  );

  return (
    <ChartCard
      title={t("workspace:dashboard.workload.title")}
      description={t("workspace:dashboard.workload.description")}
    >
      <ul
        className="flex gap-3 text-muted-foreground text-xs"
        aria-hidden="true"
      >
        {SEGMENTS.map((segment) => (
          <li key={segment.key} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-sm ${segment.className}`} />
            {t(`tasks:members.progress.${segment.key}`)}
          </li>
        ))}
      </ul>
      {workload.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("workspace:dashboard.noData")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {workload.map((row) => {
            const total = row.todo + row.doing + row.done;
            const summary = t("workspace:dashboard.workload.summary", {
              name: row.userName,
              total,
              todo: row.todo,
              doing: row.doing,
              done: row.done,
            });
            return (
              <li key={row.userId} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 truncate" title={row.userName}>
                  {row.userName}
                </span>
                <div
                  role="img"
                  aria-label={summary}
                  title={summary}
                  className="flex h-4 min-w-0 flex-1 overflow-hidden rounded bg-muted/50"
                >
                  <div
                    className="flex h-full"
                    style={{ width: `${percent(total, max)}%` }}
                  >
                    {SEGMENTS.map((segment) =>
                      row[segment.key] > 0 ? (
                        <span
                          key={segment.key}
                          className={segment.className}
                          style={{
                            width: `${percent(row[segment.key], total)}%`,
                          }}
                        />
                      ) : null,
                    )}
                  </div>
                </div>
                <span className="w-8 shrink-0 text-right tabular-nums">
                  {total}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </ChartCard>
  );
}
