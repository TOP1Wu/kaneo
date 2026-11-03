import { and, asc, eq, sql } from "drizzle-orm";
import { taskRoleTable } from "../database/schema";
import type { DbOrTx } from "../project-access/db-or-tx";

/**
 * The workspace's primary-owner role. Active roles win; an archived one is
 * still honored so the assignee mirror keeps working.
 */
export async function findOwnerRole(database: DbOrTx, workspaceId: string) {
  const [role] = await database
    .select({ id: taskRoleTable.id, name: taskRoleTable.name })
    .from(taskRoleTable)
    .where(
      and(
        eq(taskRoleTable.workspaceId, workspaceId),
        eq(taskRoleTable.isOwnerRole, true),
      ),
    )
    .orderBy(
      sql`${taskRoleTable.archivedAt} asc nulls first`,
      asc(taskRoleTable.position),
      asc(taskRoleTable.id),
    )
    .limit(1);
  return role ?? null;
}
