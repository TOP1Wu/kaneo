import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import useGetTaskRoles from "@/hooks/queries/task-role/use-get-task-roles";
import { getPriorityLabel } from "@/lib/i18n/domain";
import type { BoardFilters } from "@/lib/org-scope/scope-query";
import { MultiSelectFilter } from "./multi-select-filter";

const PRIORITIES = ["urgent", "high", "medium", "low", "no-priority"];
const PROGRESS = ["todo", "doing", "done"] as const;

type BoardFiltersBarProps = {
  workspaceId: string;
  value: BoardFilters;
  onChange: (value: BoardFilters) => void;
  /** The dashboard filters by product line only. */
  projectsOnly?: boolean;
};

export function BoardFiltersBar({
  workspaceId,
  value,
  onChange,
  projectsOnly = false,
}: BoardFiltersBarProps) {
  const { t } = useTranslation();
  const { data: projects = [] } = useGetProjects({ workspaceId });
  const { data: roleList } = useGetTaskRoles(workspaceId);
  const set = <K extends keyof BoardFilters>(key: K, next: BoardFilters[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MultiSelectFilter
        label={t("workspace:orgViews.filters.project")}
        options={projects.map((project) => ({
          value: project.id,
          label: project.name,
        }))}
        value={value.projectIds}
        onChange={(next) => set("projectIds", next)}
      />
      {!projectsOnly && (
        <>
          <MultiSelectFilter
            label={t("workspace:orgViews.filters.role")}
            options={(roleList?.roles ?? [])
              .filter((role) => !role.archived)
              .map((role) => ({ value: role.id, label: role.name }))}
            value={value.roleIds}
            onChange={(next) => set("roleIds", next)}
          />
          <MultiSelectFilter
            label={t("workspace:orgViews.filters.progress")}
            options={PROGRESS.map((progress) => ({
              value: progress,
              label: t(`tasks:members.progress.${progress}`),
            }))}
            value={value.progress}
            onChange={(next) =>
              set("progress", next as BoardFilters["progress"])
            }
          />
          <MultiSelectFilter
            label={t("workspace:orgViews.filters.priority")}
            options={PRIORITIES.map((priority) => ({
              value: priority,
              label: getPriorityLabel(priority),
            }))}
            value={value.priority}
            onChange={(next) => set("priority", next)}
          />
          <label className="flex h-7 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm">
            <Checkbox
              checked={value.overdueOnly}
              onCheckedChange={(checked) =>
                set("overdueOnly", checked === true)
              }
            />
            {t("workspace:orgViews.filters.overdueOnly")}
          </label>
        </>
      )}
    </div>
  );
}
