import { and, eq, inArray, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  taskMemberTable,
  taskRoleTable,
  userTable,
} from "../../database/schema";
import { filterUsersWithProjectAccess } from "../../project-access/filter-users-with-project-access";
import { filterAssignableUsers } from "../../utils/assert-assignable-user";
import { taskMembersView } from "../load-task-members";
import {
  type MemberActivity,
  recordMemberActivities,
} from "../member-activity";
import { publishMemberChanged } from "../publish-member-changed";
import { publishAssigneeChange } from "../sync-primary-assignee";
import type { TaskScope } from "../task-scope";
import { withLockedTaskMembers } from "../with-locked-task-members";

async function addTaskMembers(
  scope: TaskScope,
  { roleId, userIds }: { roleId: string; userIds: string[] },
  actorId: string,
) {
  const ids = [...new Set(userIds)];

  const { result: added, assigneeChange } = await withLockedTaskMembers(
    scope.taskId,
    async (tx) => {
      const [role] = await tx
        .select()
        .from(taskRoleTable)
        .where(
          and(
            eq(taskRoleTable.id, roleId),
            eq(taskRoleTable.workspaceId, scope.workspaceId),
          ),
        )
        .limit(1);
      if (!role)
        throw new HTTPException(404, { message: "Task role not found" });
      if (role.archivedAt)
        throw new HTTPException(400, { message: "Task role is archived" });

      // Members must be able to see the task, the same bar as an assignee.
      const workspaceMembers = await filterAssignableUsers(
        ids,
        scope.workspaceId,
        tx,
      );
      const visible = await filterUsersWithProjectAccess(
        [...workspaceMembers],
        scope.projectId,
        tx,
      );
      const rejected = ids.filter((id) => !visible.has(id));
      if (rejected.length > 0)
        throw new HTTPException(403, {
          message: "Some users can't access this task's project",
        });

      const [last] = await tx
        .select({ max: sql<number | null>`max(${taskMemberTable.position})` })
        .from(taskMemberTable)
        .where(
          and(
            eq(taskMemberTable.taskId, scope.taskId),
            eq(taskMemberTable.roleId, roleId),
          ),
        );
      const start = (last?.max ?? -1) + 1;
      const rows = await tx
        .insert(taskMemberTable)
        .values(
          ids.map((userId, index) => ({
            taskId: scope.taskId,
            userId,
            roleId,
            position: start + index,
            updatedBy: actorId,
          })),
        )
        .onConflictDoNothing({
          target: [
            taskMemberTable.taskId,
            taskMemberTable.userId,
            taskMemberTable.roleId,
          ],
        })
        .returning();

      const names = rows.length
        ? new Map(
            (
              await tx
                .select({ id: userTable.id, name: userTable.name })
                .from(userTable)
                .where(
                  inArray(
                    userTable.id,
                    rows.map((row) => row.userId),
                  ),
                )
            ).map((user) => [user.id, user.name]),
          )
        : new Map<string, string>();
      const activities: MemberActivity[] = rows.map((row) => ({
        type: "member_added",
        data: {
          memberUserId: row.userId,
          memberUserName: names.get(row.userId) ?? "",
          roleId: role.id,
          roleName: role.name,
        },
      }));
      // New members start at todo, so adding never makes a task ready for review.
      await recordMemberActivities(tx, scope.taskId, actorId, activities);
      return rows.map((row) => ({ ...row, roleName: role.name }));
    },
  );

  await publishAssigneeChange(assigneeChange, actorId);
  for (const row of added)
    await publishMemberChanged(
      scope,
      "added",
      {
        id: row.id,
        userId: row.userId,
        roleId: row.roleId,
        roleName: row.roleName,
        progress: row.progress,
      },
      actorId,
    );

  return taskMembersView(scope.taskId);
}

export default addTaskMembers;
