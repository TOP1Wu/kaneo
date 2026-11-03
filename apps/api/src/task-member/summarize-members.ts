type RoleRef = {
  roleId: string;
  roleName: string;
  roleSlug: string;
  rolePosition: number;
};

export type RoleSummary = {
  roleId: string;
  roleName: string;
  roleSlug: string;
  total: number;
  done: number;
};

/** Orders per-role counts by role and derives whether every member is done. */
export function summarizeRoleCounts(
  counts: readonly (RoleRef & { total: number; done: number })[],
) {
  const summary = [...counts]
    .sort(
      (a, b) =>
        a.rolePosition - b.rolePosition || a.roleId.localeCompare(b.roleId),
    )
    .map(({ roleId, roleName, roleSlug, total, done }) => ({
      roleId,
      roleName,
      roleSlug,
      total,
      done,
    }));
  const total = summary.reduce((sum, role) => sum + role.total, 0);
  return {
    summary,
    readyForReview:
      total > 0 && summary.every((role) => role.done === role.total),
  };
}

/** Per-role counts in role order, plus whether every member is done. */
export function summarizeMembers(
  members: readonly (RoleRef & { progress: string })[],
) {
  const byRole = new Map<string, RoleRef & { total: number; done: number }>();
  for (const { progress, ...role } of members) {
    const entry = byRole.get(role.roleId) ?? { ...role, total: 0, done: 0 };
    entry.total += 1;
    if (progress === "done") entry.done += 1;
    byRole.set(role.roleId, entry);
  }
  return summarizeRoleCounts([...byRole.values()]);
}
