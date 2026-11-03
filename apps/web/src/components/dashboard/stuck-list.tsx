import { useTranslation } from "react-i18next";
import { stuckReasonLabel } from "@/components/dashboard/stuck-reason-label";
import type { Dashboard } from "@/fetchers/dashboard/get-dashboard";
import { ChartCard } from "./chart-card";

type StuckRow = Dashboard["stuckList"][number];

type StuckListProps = {
  rows: Dashboard["stuckList"];
  onOpen: (row: StuckRow) => void;
};

export function StuckList({ rows, onOpen }: StuckListProps) {
  const { t } = useTranslation();

  return (
    <ChartCard title={t("workspace:dashboard.stuckList.title")}>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("workspace:dashboard.stuckList.empty")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b text-left text-muted-foreground text-xs">
                <th scope="col" className="py-2 pr-3 font-medium">
                  {t("workspace:dashboard.stuckList.task")}
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  {t("workspace:dashboard.stuckList.blockedBy")}
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  {t("workspace:dashboard.stuckList.reason")}
                </th>
                <th scope="col" className="w-20 py-2 text-right font-medium">
                  {t("workspace:dashboard.stuckList.days")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.taskId}
                  className="border-border/60 border-b last:border-b-0"
                >
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      data-task-id={row.taskId}
                      onClick={() => onOpen(row)}
                      className="flex min-w-0 flex-col items-start rounded-sm text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="font-medium">{row.title}</span>
                      <span className="text-muted-foreground text-xs">
                        {row.projectName} ·{" "}
                        <span className="font-mono">{row.ticket}</span>
                      </span>
                    </button>
                  </td>
                  <td className="py-2 pr-3">
                    {row.blockedBy
                      .map(
                        (person) => `${person.userName}（${person.roleName}）`,
                      )
                      .join("、")}
                  </td>
                  <td className="py-2 pr-3 text-destructive-foreground">
                    {stuckReasonLabel(row.stuckReason, t)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {t("workspace:dashboard.stuckList.dayCount", {
                      count: row.stuckDays,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
}
