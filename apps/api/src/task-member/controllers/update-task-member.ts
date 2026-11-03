import { and, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { taskMemberTable, taskRoleTable } from "../../database/schema";
import { loadTaskMembers, taskMembersView } from "../load-task-members";
import {
  type MemberActivity,
  readyForReviewActivity,
  recordMemberActivities,
} from "../member-activity";
import {
  type MemberProgress,
  progressTimestamps,
} from "../progress-timestamps";
import { publishMemberChanged } from "../publish-member-changed";
import { publishAssigneeChange } from "../sync-primary-assignee";
import type { TaskScope } from "../task-scope";
import { allDone, withLockedTaskMembers } from "../with-locked-task-members";

export type UpdateTaskMemberInput = {
  roleId?: string;
  progress?: MemberProgress;
  note?: string | null;
  position?: number;
};

async function updateTaskMember(
  scope: TaskScope,
  memberId: string,
  input: UpdateTaskMemberInput,
  actorId: string,
) {
  const { result: updated, assigneeChange } = await withLockedTaskMembers(
    scope.taskId,
    async (tx, before) => {
      const member = before.find((row) => row.id === memberId);
      if (!member)
        throw new HTTPException(404, { message: "Task member not found" });

      const onBehalfOf = member.userId !== actorId;
      const base = {
        memberUserId: member.userId,
        memberUserName: member.userName,
        roleId: member.roleId,
        roleName: member.roleName,
      };
      const activities: MemberActivity[] = [];
      const changes: Partial<typeof taskMemberTable.$inferInsert> = {};

      if (input.roleId !== undefined && input.roleId !== member.roleId) {
        const [role] = await tx
          .select()
          .from(taskRoleTable)
          .where(
            and(
              eq(taskRoleTable.id, input.roleId),
              eq(taskRoleTable.workspaceId, scope.workspaceId),
            ),
          )
          .limit(1);
        if (!role)
          throw new HTTPException(404, { message: "Task role not found" });
        if (role.archivedAt)
          throw new HTTPException(400, { message: "Task role is archived" });
        if (
          before.some(
            (row) => row.userId === member.userId && row.roleId === role.id,
          )
        )
          throw new HTTPException(409, {
            message: "The user already holds that role on this task",
          });

        const [last] = await tx
          .select({ max: sql<number | null>`max(${taskMemberTable.position})` })
          .from(taskMemberTable)
          .where(
            and(
              eq(taskMemberTable.taskId, scope.taskId),
              eq(taskMemberTable.roleId, role.id),
            ),
          );
        changes.roleId = role.id;
        changes.position = (last?.max ?? -1) + 1;
        activities.push({
          type: "member_role_changed",
          data: {
            ...base,
            roleId: role.id,
            roleName: role.name,
            from: member.roleName,
            to: role.name,
            onBehalfOf,
          },
        });
      }

      if (input.position !== undefined) changes.position = input.position;
      if (input.note !== undefined) changes.note = input.note;

      if (input.progress !== undefined && input.progress !== member.progress) {
        Object.assign(
          changes,
          { progress: input.progress },
          progressTimestamps(
            member.progress,
            input.progress,
            member,
            new Date(),
          ),
        );
        activities.push({
          type: "member_progress_changed",
          data: {
            ...base,
            from: member.progress,
            to: input.progress,
            onBehalfOf,
          },
        });
      }

      if (Object.keys(changes).length === 0) return member;

      await tx
        .update(taskMemberTable)
        .set({ ...changes, updatedBy: actorId })
        .where(eq(taskMemberTable.id, memberId));

      const after = await loadTaskMembers(scope.taskId, tx);
      activities.push(
        ...readyForReviewActivity(allDone(before), allDone(after), base),
      );
      await recordMemberActivities(tx, scope.taskId, actorId, activities);
      return after.find((row) => row.id === memberId) ?? member;
    },
  );

  await publishAssigneeChange(assigneeChange, actorId);
  await publishMemberChanged(
    scope,
    "updated",
    {
      id: updated.id,
      userId: updated.userId,
      roleId: updated.roleId,
      roleName: updated.roleName,
      progress: updated.progress,
    },
    actorId,
  );

  return taskMembersView(scope.taskId);
}

export default updateTaskMember;
