import { useTranslation } from "react-i18next";
import type { Dashboard } from "@/fetchers/dashboard/get-dashboard";
import { cn } from "@/lib/cn";
import { getStatusDisplayLabel } from "@/lib/i18n/domain";
import { PROGRESS_TRACK, statusTones } from "@/lib/task-member/progress-tone";
import { ChartCard } from "./chart-card";
import { percent } from "./chart-helpers";

export function ProjectDistributionChart({
  byProject,
}: {
  byProject: Dashboard["byProject"];
}) {
  const { t } = useTranslation();
  const statuses = byProject.flatMap((project) => project.byStatus);
  // Final columns read as done (green); other statuses stay neutral so green
  // and blue keep their personal-progress meaning on this page.
  const colors = statusTones(statuses);
  const legend = [
    ...new Map(statuses.map((entry) => [entry.status, entry])).values(),
  ];
  const max = Math.max(
    1,
    ...byProject.map((project) =>
      project.byStatus.reduce((sum, entry) => sum + entry.count, 0),
    ),
  );

  return (
    <ChartCard title={t("workspace:dashboard.byProject.title")}>
      <ul
        className="flex flex-wrap gap-3 text-muted-foreground text-xs"
        aria-hidden="true"
      >
        {legend.map((entry) => (
          <li key={entry.status} className="flex items-center gap-1.5">
            <span
              className={cn("size-2 rounded-sm", colors.get(entry.status))}
            />
            {getStatusDisplayLabel(entry.status, entry.statusName)}
          </li>
        ))}
      </ul>
      {byProject.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("workspace:dashboard.noData")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {byProject.map((project) => {
            const total = project.byStatus.reduce(
              (sum, entry) => sum + entry.count,
              0,
            );
            const summary = [
              project.projectName,
              ...project.byStatus.map(
                (entry) =>
                  `${getStatusDisplayLabel(entry.status, entry.statusName)} ${entry.count}`,
              ),
            ].join(", ");
            return (
              <li
                key={project.projectId}
                className="flex items-center gap-3 text-sm"
              >
                <span
                  className="w-24 shrink-0 truncate"
                  title={project.projectName}
                >
                  {project.projectName}
                </span>
                <div
                  role="img"
                  aria-label={summary}
                  title={summary}
                  className={cn(
                    "flex h-4 min-w-0 flex-1 overflow-hidden rounded",
                    PROGRESS_TRACK,
                  )}
                >
                  <div
                    className="flex h-full"
                    style={{ width: `${percent(total, max)}%` }}
                  >
                    {project.byStatus.map((entry) => (
                      <span
                        key={entry.status}
                        className={colors.get(entry.status)}
                        style={{ width: `${percent(entry.count, total)}%` }}
                      />
                    ))}
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
