import { and, asc, eq, sql } from "drizzle-orm";
import { taskMemberTable, taskTable, userTable } from "../database/schema";
import type { DbOrTx } from "../project-access/db-or-tx";
import { publishTaskMutation } from "../task/controllers/task-mutation-effects";
import { findOwnerRole } from "./find-owner-role";
import { recordMemberActivities } from "./member-activity";
import { loadTaskScope } from "./task-scope";

type AssigneeTask = Pick<
  typeof taskTable.$inferSelect,
  "id" | "projectId" | "title" | "userId"
>;

/** An assignee write made inside a transaction, published after it commits. */
export type AssigneeChange = { before: AssigneeTask; after: AssigneeTask };

/**
 * Mirrors the first primary-owner member (lowest position, then earliest
 * added) into `task.assignee_id`, or clears it when the role is empty. Writes
 * only when the value changes. Callers hold the task row lock.
 */
export async function syncPrimaryAssignee(
  tx: DbOrTx,
  taskId: string,
): Promise<AssigneeChange | null> {
  const scope = await loadTaskScope(taskId, tx);
  const ownerRole = await findOwnerRole(tx, scope.workspaceId);
  const [first] = ownerRole
    ? await tx
        .select({ userId: taskMemberTable.userId })
        .from(taskMemberTable)
        .where(
          and(
            eq(taskMemberTable.taskId, taskId),
            eq(taskMemberTable.roleId, ownerRole.id),
          ),
        )
        .orderBy(
          asc(taskMemberTable.position),
          asc(taskMemberTable.createdAt),
          asc(taskMemberTable.id),
        )
        .limit(1)
    : [];
  const nextAssignee = first?.userId ?? null;
  if (nextAssignee === scope.assigneeId) return null;

  const [before] = await tx
    .select({
      id: taskTable.id,
      projectId: taskTable.projectId,
      title: taskTable.title,
      userId: taskTable.userId,
    })
    .from(taskTable)
    .where(eq(taskTable.id, taskId))
    .limit(1);
  if (!before) return null;
  await tx
    .update(taskTable)
    .set({ userId: nextAssignee })
    .where(eq(taskTable.id, taskId));
  return { before, after: { ...before, userId: nextAssignee } };
}

/**
 * Reverse direction: after another entry point sets the assignee, make sure
 * they lead the primary-owner role. Never touches `task.assignee_id`, so it
 * can't recurse into `syncPrimaryAssignee`. A null assignee removes nobody.
 * Returns what changed so the caller can publish it after commit.
 */
export async function ensureAssigneeIsPrimaryMember(
  tx: DbOrTx,
  taskId: string,
  userId: string | null,
  actorId?: string | null,
): Promise<EnsuredMember | null> {
  if (!userId) return null;
  const scope = await loadTaskScope(taskId, tx);
  const ownerRole = await findOwnerRole(tx, scope.workspaceId);
  if (!ownerRole) return null;

  const owners = await tx
    .select({ id: taskMemberTable.id, userId: taskMemberTable.userId })
    .from(taskMemberTable)
    .where(
      and(
        eq(taskMemberTable.taskId, taskId),
        eq(taskMemberTable.roleId, ownerRole.id),
      ),
    )
    .orderBy(
      asc(taskMemberTable.position),
      asc(taskMemberTable.createdAt),
      asc(taskMemberTable.id),
    );
  const existing = owners.find((owner) => owner.userId === userId);
  if (owners[0]?.userId === userId) return null;

  // Make room at position 0 so the assignee stays first under the sync rule.
  await tx
    .update(taskMemberTable)
    .set({ position: sql`${taskMemberTable.position} + 1` })
    .where(
      and(
        eq(taskMemberTable.taskId, taskId),
        eq(taskMemberTable.roleId, ownerRole.id),
      ),
    );

  if (existing) {
    await tx
      .update(taskMemberTable)
      .set({ position: 0, updatedBy: actorId ?? null })
      .where(eq(taskMemberTable.id, existing.id));
    return { memberId: existing.id, action: "updated" };
  }

  const [inserted] = await tx
    .insert(taskMemberTable)
    .values({
      taskId,
      userId,
      roleId: ownerRole.id,
      position: 0,
      updatedBy: actorId ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: taskMemberTable.id });
  if (!inserted) return null;

  const [user] = await tx
    .select({ name: userTable.name })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  await recordMemberActivities(tx, taskId, actorId ?? null, [
    {
      type: "member_added",
      data: {
        memberUserId: userId,
        memberUserName: user?.name ?? "",
        roleId: ownerRole.id,
        roleName: ownerRole.name,
      },
    },
  ]);
  return { memberId: inserted.id, action: "added" };
}

export type EnsuredMember = { memberId: string; action: "added" | "updated" };

/** Same side effects as `updateTaskAssignee`: one event, so one notification. */
export async function publishAssigneeChange(
  change: AssigneeChange | null,
  actorId: string,
) {
  if (!change) return;
  await publishTaskMutation(change.before, change.after, actorId, {
    fields: ["userId"],
  });
}
