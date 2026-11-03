import { taskRoleTable } from "../database/schema";
import type { DbOrTx } from "../project-access/db-or-tx";

// Keep in sync with the seed in drizzle/0073, which backfills existing workspaces.
export const DEFAULT_TASK_ROLES = [
  { name: "主要负责人", slug: "owner", position: 0, isOwnerRole: true },
  { name: "产品", slug: "product", position: 1, isOwnerRole: false },
  { name: "开发", slug: "dev", position: 2, isOwnerRole: false },
  { name: "测试", slug: "qa", position: 3, isOwnerRole: false },
] as const;

/** Idempotent: one multi-row insert, skipping slugs the workspace already has. */
export async function seedDefaultTaskRoles(tx: DbOrTx, workspaceId: string) {
  await tx
    .insert(taskRoleTable)
    .values(DEFAULT_TASK_ROLES.map((role) => ({ ...role, workspaceId })))
    .onConflictDoNothing({
      target: [taskRoleTable.workspaceId, taskRoleTable.slug],
    });
}
