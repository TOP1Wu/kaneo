import { inArray } from "drizzle-orm";
import { taskMemberTable, taskRoleTable } from "../database/schema";
import type { DbOrTx } from "../project-access/db-or-tx";

/**
 * `task_member.role_id` restricts deletes so an in-use role is archived, never
 * dropped. Postgres checks that restriction while a workspace delete is still
 * cascading, so callers that delete workspaces clear the members first.
 */
export async function clearWorkspaceTaskMembers(
  tx: DbOrTx,
  workspaceIds: string[],
) {
  if (workspaceIds.length === 0) return;
  await tx
    .delete(taskMemberTable)
    .where(
      inArray(
        taskMemberTable.roleId,
        tx
          .select({ id: taskRoleTable.id })
          .from(taskRoleTable)
          .where(inArray(taskRoleTable.workspaceId, workspaceIds)),
      ),
    );
}
