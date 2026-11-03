type GroupableMember = {
  roleId: string;
  roleName: string;
  position: number;
};

type OrderedRole = { id: string; position: number };

export type RoleGroup<T> = {
  roleId: string;
  roleName: string;
  members: T[];
};

/**
 * Members grouped by role in the workspace's role order. A role missing from
 * the list (archived, or not loaded yet) still shows, after the known ones.
 */
export function groupMembersByRole<T extends GroupableMember>(
  members: readonly T[],
  roles: readonly OrderedRole[],
): RoleGroup<T>[] {
  const order = new Map(roles.map((role) => [role.id, role.position]));
  const groups = new Map<string, RoleGroup<T>>();
  for (const member of members) {
    const group = groups.get(member.roleId) ?? {
      roleId: member.roleId,
      roleName: member.roleName,
      members: [],
    };
    group.members.push(member);
    groups.set(member.roleId, group);
  }
  for (const group of groups.values()) {
    group.members.sort((a, b) => a.position - b.position);
  }
  return [...groups.values()].sort(
    (a, b) =>
      (order.get(a.roleId) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.roleId) ?? Number.MAX_SAFE_INTEGER) ||
      a.roleName.localeCompare(b.roleName),
  );
}
