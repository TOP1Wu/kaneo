import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { taskMemberTable } from "../../database/schema";
import { loadTaskMembers } from "../load-task-members";
import {
  readyForReviewActivity,
  recordMemberActivities,
} from "../member-activity";
import { publishMemberChanged } from "../publish-member-changed";
import { publishAssigneeChange } from "../sync-primary-assignee";
import type { TaskScope } from "../task-scope";
import { allDone, withLockedTaskMembers } from "../with-locked-task-members";

async function removeTaskMember(
  scope: TaskScope,
  memberId: string,
  actorId: string,
) {
  const { result: removed, assigneeChange } = await withLockedTaskMembers(
    scope.taskId,
    async (tx, before) => {
      const member = before.find((row) => row.id === memberId);
      if (!member)
        throw new HTTPException(404, { message: "Task member not found" });

      await tx.delete(taskMemberTable).where(eq(taskMemberTable.id, memberId));

      const data = {
        memberUserId: member.userId,
        memberUserName: member.userName,
        roleId: member.roleId,
        roleName: member.roleName,
      };
      const after = await loadTaskMembers(scope.taskId, tx);
      await recordMemberActivities(tx, scope.taskId, actorId, [
        { type: "member_removed", data },
        // Removing the last unfinished member can complete the task.
        ...readyForReviewActivity(allDone(before), allDone(after), data),
      ]);
      return member;
    },
  );

  await publishAssigneeChange(assigneeChange, actorId);
  await publishMemberChanged(
    scope,
    "removed",
    {
      id: removed.id,
      userId: removed.userId,
      roleId: removed.roleId,
      roleName: removed.roleName,
      progress: removed.progress,
    },
    actorId,
  );

  return { id: removed.id, taskId: removed.taskId };
}

export default removeTaskMember;
