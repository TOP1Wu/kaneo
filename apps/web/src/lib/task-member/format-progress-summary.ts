type RoleCount = {
  roleId: string;
  roleName: string;
  total: number;
  done: number;
};

export type ProgressSegment = {
  roleId: string;
  label: string;
  complete: boolean;
};

/** One segment per role, like "开发 1/3", in the order the API returns. */
export function progressSegments(
  summary: readonly RoleCount[],
): ProgressSegment[] {
  return summary
    .filter((role) => role.total > 0)
    .map((role) => ({
      roleId: role.roleId,
      label: `${role.roleName} ${role.done}/${role.total}`,
      complete: role.done === role.total,
    }));
}

/** The whole line as text: "产品 2/2 · 开发 1/3 · 测试 0/2". */
export function formatProgressSummary(summary: readonly RoleCount[]): string {
  return progressSegments(summary)
    .map((segment) => segment.label)
    .join(" · ");
}
