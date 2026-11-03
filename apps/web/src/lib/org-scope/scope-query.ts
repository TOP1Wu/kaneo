export type ScopeName = "mine" | "unit" | "all";

export type ScopeSelection = {
  scope: ScopeName;
  unitId?: string;
};

export type BoardFilters = {
  projectIds: string[];
  roleIds: string[];
  progress: Array<"todo" | "doing" | "done">;
  priority: string[];
  overdueOnly: boolean;
};

export type DashboardRange = {
  from?: string;
  to?: string;
};

export const EMPTY_BOARD_FILTERS: BoardFilters = {
  projectIds: [],
  roleIds: [],
  progress: [],
  priority: [],
  overdueOnly: false,
};

// The Hono client drops undefined values, so unset filters stay out of the URL.
function csv(values: readonly string[]) {
  return values.length > 0 ? values.join(",") : undefined;
}

export function toScopeQuery(selection: ScopeSelection, projectIds: string[]) {
  return {
    scope: selection.scope,
    unitId: selection.scope === "unit" ? selection.unitId : undefined,
    projectIds: csv(projectIds),
  };
}

export function toLeaderBoardQuery(
  selection: ScopeSelection,
  filters: BoardFilters,
) {
  return {
    ...toScopeQuery(selection, filters.projectIds),
    roleIds: csv(filters.roleIds),
    progress: csv(filters.progress),
    priority: csv(filters.priority),
    overdue: filters.overdueOnly ? ("true" as const) : undefined,
  };
}

export function toDashboardQuery(
  selection: ScopeSelection,
  projectIds: string[],
  range: DashboardRange,
) {
  return {
    ...toScopeQuery(selection, projectIds),
    from: range.from || undefined,
    to: range.to || undefined,
  };
}
