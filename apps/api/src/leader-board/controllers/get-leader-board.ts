import { loadScope } from "../../org-unit/scope/load-scope";
import { loadScopedTasks } from "../../org-unit/scope/load-scoped-tasks";
import type { ScopeName } from "../../org-unit/scope/resolve-scope";
import { type BoardFilters, buildPeople } from "../build-people";
import { getUnitNames } from "../get-unit-names";
import { stuckThresholdDays } from "../stuck";

export async function getLeaderBoard({
  workspaceId,
  actorId,
  isInstanceAdmin,
  query,
  now = new Date(),
}: {
  workspaceId: string;
  actorId: string;
  isInstanceAdmin: boolean;
  query: {
    scope: ScopeName;
    unitId?: string;
    projectIds?: string[];
  } & Omit<BoardFilters, "overdue"> & { overdue?: "true" | "false" };
  now?: Date;
}) {
  const scope = await loadScope({
    workspaceId,
    actorId,
    isInstanceAdmin,
    scope: query.scope,
    unitId: query.unitId,
  });
  const [{ tasks, users }, unitNames] = await Promise.all([
    loadScopedTasks(workspaceId, actorId, scope, {
      projectIds: query.projectIds,
      includeCompleted: false,
    }),
    getUnitNames(workspaceId, scope.people),
  ]);
  const thresholdDays = stuckThresholdDays();

  return {
    people: buildPeople({
      people: scope.people,
      tasks,
      users,
      unitNames,
      filters: {
        roleIds: query.roleIds,
        progress: query.progress,
        priority: query.priority,
        overdue:
          query.overdue === undefined ? undefined : query.overdue === "true",
      },
      now,
      thresholdDays,
    }),
    stuckThresholdDays: thresholdDays,
  };
}
