import { and, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  taskMemberTable,
  taskRoleTable,
  userTable,
} from "../../database/schema";
import { filterUsersWithProjectAccess } from "../../project-access/filter-users-with-project-access";
import { filterAssignableUsers } from "../../utils/assert-assignable-user";
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
  userId?: string;
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

      // Handing the seat to someone else starts their progress over: the old
      // person's note and timestamps don't describe the new one.
      const takeover =
        input.userId !== undefined && input.userId !== member.userId
          ? input.userId
          : null;
      let next: { memberUserId: string; memberUserName: string } | null = null;
      if (takeover) {
        if (
          before.some(
            (row) => row.userId === takeover && row.roleId === member.roleId,
          )
        )
          throw new HTTPException(409, {
            message: "The user already holds that role on this task",
          });

        // Whoever takes the seat must see the task, the same bar as an assignee.
        const assignable = await filterAssignableUsers(
          [takeover],
          scope.workspaceId,
          tx,
        );
        const visible = await filterUsersWithProjectAccess(
          [...assignable],
          scope.projectId,
          tx,
        );
        if (!visible.has(takeover))
          throw new HTTPException(403, {
            message: "That user can't access this task's project",
          });

        const [taker] = await tx
          .select({ id: userTable.id, name: userTable.name })
          .from(userTable)
          .where(eq(userTable.id, takeover))
          .limit(1);
        if (!taker) throw new HTTPException(404, { message: "User not found" });
        next = { memberUserId: taker.id, memberUserName: taker.name };
        Object.assign(changes, {
          userId: taker.id,
          progress: "todo",
          startedAt: null,
          doneAt: null,
          note: null,
        });
        activities.push(
          { type: "member_removed", data: base },
          {
            type: "member_added",
            data: { ...base, ...next },
          },
        );
      }
      // Every other activity describes the person who ends up holding the seat.
      const holder = next ? { ...base, ...next } : base;

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
            (row) =>
              row.userId === holder.memberUserId && row.roleId === role.id,
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
            ...holder,
            roleId: role.id,
            roleName: role.name,
            from: member.roleName,
            to: role.name,
            onBehalfOf,
          },
        });
      }

      if (input.position !== undefined) changes.position = input.position;
      if (!takeover && input.note !== undefined) changes.note = input.note;

      if (
        !takeover &&
        input.progress !== undefined &&
        input.progress !== member.progress
      ) {
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
            ...holder,
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
