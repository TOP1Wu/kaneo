import type { Context } from "hono";
import { and, eq } from "drizzle-orm";
import db from "../database";
import { taskMemberTable, taskRoleTable } from "../database/schema";
import { leaderEditGuard } from "../leader-board/leader-edit-guard";
import { hasWorkspacePermission } from "../utils/require-workspace-permission";

/** The member row a guard decides on. */
export type EditableMember = {
  id: string;
  taskId: string;
  userId: string;
  roleId: string;
  workspaceId: string;
};

/** Whether the actor holds a primary-owner role on the task. */
export async function isTaskPrimaryOwner(actorId: string, taskId: string) {
  const [row] = await db
    .select({ id: taskMemberTable.id })
    .from(taskMemberTable)
    .innerJoin(taskRoleTable, eq(taskMemberTable.roleId, taskRoleTable.id))
    .where(
      and(
        eq(taskMemberTable.taskId, taskId),
        eq(taskMemberTable.userId, actorId),
        eq(taskRoleTable.isOwnerRole, true),
      ),
    )
    .limit(1);
  return Boolean(row);
}

// Workspace owners/admins hold manage_settings; members never do by default.
const isWorkspaceManager = (c: Context) =>
  hasWorkspacePermission(c, { workspace: ["manage_settings"] });

/** Add/remove members or change someone's role. */
export async function canManageTaskMembers(c: Context, taskId: string) {
  return (
    (await hasWorkspacePermission(c, { task: ["update"] })) ||
    (await isWorkspaceManager(c)) ||
    (await isTaskPrimaryOwner(c.get("userId"), taskId))
  );
}

/** Change a member's progress or note. Editing another member's row is "on behalf of". */
export async function canEditMemberProgress(
  c: Context,
  member: EditableMember,
) {
  const actorId: string = c.get("userId");
  if (member.userId === actorId) return true;
  return (
    (await isTaskPrimaryOwner(actorId, member.taskId)) ||
    (await isWorkspaceManager(c)) ||
    (await leaderEditGuard(actorId, member).catch(() => false))
  );
}
