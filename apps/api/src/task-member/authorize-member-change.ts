import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { canEditMemberProgress, canManageTaskMembers } from "./can-edit-member";
import { loadTaskMember } from "./load-task-members";
import { loadTaskScope } from "./task-scope";

const forbidden = (message: string) => new HTTPException(403, { message });

export async function authorizeManageMembers(c: Context, taskId: string) {
  const scope = await loadTaskScope(taskId);
  if (!(await canManageTaskMembers(c, taskId)))
    throw forbidden(
      "Only the task's primary owner or a workspace admin can manage members",
    );
  return scope;
}

/**
 * Handing a seat to someone else, or moving it between roles and positions,
 * needs member management; progress and note need the edit right.
 */
export async function authorizeMemberUpdate(
  c: Context,
  memberId: string,
  input: {
    userId?: string;
    roleId?: string;
    position?: number;
    progress?: string;
    note?: string | null;
  },
) {
  const member = await loadTaskMember(memberId);
  if (!member)
    throw new HTTPException(404, { message: "Task member not found" });
  const scope = await loadTaskScope(member.taskId);

  if (
    (input.userId !== undefined ||
      input.roleId !== undefined ||
      input.position !== undefined) &&
    !(await canManageTaskMembers(c, member.taskId))
  )
    throw forbidden(
      "Only the task's primary owner or a workspace admin can reassign members",
    );

  if (
    (input.progress !== undefined || input.note !== undefined) &&
    !(await canEditMemberProgress(c, {
      ...member,
      workspaceId: scope.workspaceId,
    }))
  )
    throw forbidden("You can only update your own progress on this task");

  return scope;
}

export async function authorizeMemberRemoval(c: Context, memberId: string) {
  const member = await loadTaskMember(memberId);
  if (!member)
    throw new HTTPException(404, { message: "Task member not found" });
  return authorizeManageMembers(c, member.taskId);
}
