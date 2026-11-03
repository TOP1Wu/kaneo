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
 * Role and order changes move people in and out of the primary-owner slot, so
 * they need member management; progress and note need the edit right.
 */
export async function authorizeMemberUpdate(
  c: Context,
  memberId: string,
  input: {
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
    (input.roleId !== undefined || input.position !== undefined) &&
    !(await canManageTaskMembers(c, member.taskId))
  )
    throw forbidden(
      "Only the task's primary owner or a workspace admin can change roles",
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
