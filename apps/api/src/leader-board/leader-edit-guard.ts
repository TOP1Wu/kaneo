import { eq } from "drizzle-orm";
import db from "../database";
import { projectTable, taskTable } from "../database/schema";
import { getSubordinateUserIds } from "../org-unit/get-subordinate-user-ids";

/** The fields the guard reads; any task_member row satisfies it. */
export type GuardedMember = { taskId: string; userId: string };

/**
 * Lets an org leader edit the progress of anyone below them (recursively) on
 * a task in the same workspace. Meant for the task-member edit hook:
 * `registerExtraEditGuard(leaderEditGuard)`.
 */
export async function leaderEditGuard(
  actorId: string,
  member: GuardedMember,
): Promise<boolean> {
  if (actorId === member.userId) return false;
  const [task] = await db
    .select({ workspaceId: projectTable.workspaceId })
    .from(taskTable)
    .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
    .where(eq(taskTable.id, member.taskId))
    .limit(1);
  if (!task) return false;
  const subordinates = await getSubordinateUserIds(task.workspaceId, actorId);
  return subordinates.includes(member.userId);
}
