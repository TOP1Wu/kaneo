import type { taskRoleTable } from "../database/schema";

type TaskRoleRow = typeof taskRoleTable.$inferSelect;

export function serializeTaskRole(role: TaskRoleRow) {
  return {
    id: role.id,
    workspaceId: role.workspaceId,
    name: role.name,
    slug: role.slug,
    color: role.color,
    position: role.position,
    isOwnerRole: role.isOwnerRole,
    archived: role.archivedAt !== null,
  };
}
