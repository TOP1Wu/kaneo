import { useTranslation } from "react-i18next";
import type { Dashboard } from "@/fetchers/dashboard/get-dashboard";
import { cn } from "@/lib/cn";
import { PROGRESS_TONE, PROGRESS_TRACK } from "@/lib/task-member/progress-tone";
import { ChartCard } from "./chart-card";
import { percent } from "./chart-helpers";

export function RoleCompletionChart({
  roles,
}: {
  roles: Dashboard["roleCompletion"];
}) {
  const { t } = useTranslation();
  const shown = roles.filter((role) => role.total > 0);

  return (
    <ChartCard
      title={t("workspace:dashboard.roleCompletion.title")}
      description={t("workspace:dashboard.roleCompletion.description")}
    >
      {shown.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("workspace:dashboard.noData")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {shown.map((role) => {
            const value = percent(role.done, role.total);
            return (
              <li key={role.roleId} className="flex flex-col gap-1 text-sm">
                <span className="flex items-center justify-between gap-2">
                  <span>{role.roleName}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {role.done}/{role.total} · {value}%
                  </span>
                </span>
                <div
                  role="meter"
                  aria-label={role.roleName}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={value}
                  className={cn(
                    "h-2 overflow-hidden rounded-full",
                    PROGRESS_TRACK,
                  )}
                >
                  <div
                    className={cn(
                      "h-full rounded-full",
                      PROGRESS_TONE.done.bar,
                    )}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ChartCard>
  );
}
