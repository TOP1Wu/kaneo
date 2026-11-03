import { useState } from "react";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import { BoardFiltersBar } from "@/components/org-views/board-filters-bar";
import { ScopeSwitcher } from "@/components/org-views/scope-switcher";
import { useOrgViewScope } from "@/components/org-views/use-org-view-scope";
import TaskDetailsSheet from "@/components/task/task-details-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import useGetDashboard from "@/hooks/queries/dashboard/use-get-dashboard";
import {
  type BoardFilters,
  type DashboardRange,
  EMPTY_BOARD_FILTERS,
} from "@/lib/org-scope/scope-query";
import { DashboardView } from "./dashboard-view";
import { DateRangeFilter } from "./date-range-filter";

type OpenTask = { taskId: string; projectId: string };

export function DashboardPage({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const { options, units, selection, setSelection, ready } =
    useOrgViewScope(workspaceId);
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_BOARD_FILTERS);
  const [range, setRange] = useState<DashboardRange>({});
  const [open, setOpen] = useState<OpenTask | null>(null);
  const dashboard = useGetDashboard(
    workspaceId,
    selection,
    filters.projectIds,
    range,
    ready,
  );

  return (
    <WorkspaceLayout title={t("workspace:dashboard.title")}>
      <div className="h-full overflow-y-auto">
        <div className="flex flex-col gap-2 border-border border-b px-4 py-3">
          <ScopeSwitcher
            options={options}
            units={units}
            value={selection}
            onChange={setSelection}
          />
          <div className="flex flex-wrap items-center gap-3">
            <BoardFiltersBar
              workspaceId={workspaceId}
              value={filters}
              onChange={setFilters}
              projectsOnly
            />
            <DateRangeFilter value={range} onChange={setRange} />
          </div>
        </div>
        <div className="p-4">
          {!ready || dashboard.isPending ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : dashboard.isError ? (
            <p role="alert" className="text-destructive-foreground text-sm">
              {dashboard.error instanceof Error
                ? dashboard.error.message
                : t("workspace:orgViews.loadError")}
            </p>
          ) : (
            <DashboardView data={dashboard.data} onOpenTask={setOpen} />
          )}
        </div>
      </div>

      <TaskDetailsSheet
        taskId={open?.taskId}
        projectId={open?.projectId ?? ""}
        workspaceId={workspaceId}
        onClose={() => setOpen(null)}
      />
    </WorkspaceLayout>
  );
}
