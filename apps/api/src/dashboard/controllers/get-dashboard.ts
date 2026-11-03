import { stuckThresholdDays } from "../../leader-board/stuck";
import { loadScope } from "../../org-unit/scope/load-scope";
import { loadScopedTasks } from "../../org-unit/scope/load-scoped-tasks";
import type { ScopeName } from "../../org-unit/scope/resolve-scope";
import { buildDashboard } from "../build-dashboard";

export async function getDashboard({
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
    from?: Date;
    to?: Date;
  };
  now?: Date;
}) {
  const scope = await loadScope({
    workspaceId,
    actorId,
    isInstanceAdmin,
    scope: query.scope,
    unitId: query.unitId,
  });
  const { tasks, users, roles } = await loadScopedTasks(
    workspaceId,
    actorId,
    scope,
    {
      projectIds: query.projectIds,
      includeCompleted: true,
      createdFrom: query.from,
      createdBefore: query.to,
    },
  );
  return buildDashboard({
    people: scope.people,
    tasks,
    users,
    roles,
    now,
    thresholdDays: stuckThresholdDays(),
  });
}
