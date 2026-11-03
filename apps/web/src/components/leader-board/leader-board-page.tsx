import { Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import { BoardFiltersBar } from "@/components/org-views/board-filters-bar";
import { ScopeSwitcher } from "@/components/org-views/scope-switcher";
import { useOrgViewScope } from "@/components/org-views/use-org-view-scope";
import TaskDetailsSheet from "@/components/task/task-details-sheet";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import useGetLeaderBoard from "@/hooks/queries/leader-board/use-get-leader-board";
import {
  EMPTY_BOARD_FILTERS,
  type BoardFilters,
} from "@/lib/org-scope/scope-query";
import { LeaderBoardColumn } from "./leader-board-column";

type OpenTask = { taskId: string; projectId: string };

export function LeaderBoardPage({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const { options, units, selection, setSelection, ready } =
    useOrgViewScope(workspaceId);
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_BOARD_FILTERS);
  const [open, setOpen] = useState<OpenTask | null>(null);
  const board = useGetLeaderBoard(workspaceId, selection, filters, ready);
  const people = board.data?.people ?? [];

  return (
    <WorkspaceLayout title={t("workspace:leaderBoard.title")}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-col gap-2 border-border border-b px-4 py-3">
          <ScopeSwitcher
            options={options}
            units={units}
            value={selection}
            onChange={setSelection}
          />
          <BoardFiltersBar
            workspaceId={workspaceId}
            value={filters}
            onChange={setFilters}
          />
          {board.data && (
            <p className="text-muted-foreground text-xs">
              {t("workspace:leaderBoard.threshold", {
                count: board.data.stuckThresholdDays,
              })}
            </p>
          )}
        </div>

        {!ready || board.isPending ? (
          <div className="flex gap-3 p-4">
            {[1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-80 w-72 rounded-xl" />
            ))}
          </div>
        ) : board.isError ? (
          <p role="alert" className="p-6 text-destructive-foreground text-sm">
            {board.error instanceof Error
              ? board.error.message
              : t("workspace:orgViews.loadError")}
          </p>
        ) : people.length === 0 ? (
          <Empty className="min-h-[50vh]">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>{t("workspace:leaderBoard.emptyTitle")}</EmptyTitle>
              <EmptyDescription>
                {t("workspace:leaderBoard.emptyDescription")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
            {people.map((person) => (
              <LeaderBoardColumn
                key={person.userId}
                person={person}
                onOpen={(card) =>
                  setOpen({ taskId: card.taskId, projectId: card.projectId })
                }
              />
            ))}
          </div>
        )}
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
