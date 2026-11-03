import { asc, count, eq, inArray, sql } from "drizzle-orm";
import db from "../../database";
import { taskMemberTable, taskRoleTable } from "../../database/schema";
import { summarizeRoleCounts } from "../summarize-members";

/** Per-task role summaries for a board or list, in one aggregate query. */
async function getTaskMemberSummaries(taskIds: readonly string[]) {
  const ids = [...new Set(taskIds)];
  const rows = ids.length
    ? await db
        .select({
          taskId: taskMemberTable.taskId,
          roleId: taskRoleTable.id,
          roleName: taskRoleTable.name,
          roleSlug: taskRoleTable.slug,
          rolePosition: taskRoleTable.position,
          total: count(),
          done: sql<number>`count(*) filter (where ${taskMemberTable.progress} = 'done')`.mapWith(
            Number,
          ),
        })
        .from(taskMemberTable)
        .innerJoin(taskRoleTable, eq(taskMemberTable.roleId, taskRoleTable.id))
        .where(inArray(taskMemberTable.taskId, ids))
        .groupBy(
          taskMemberTable.taskId,
          taskRoleTable.id,
          taskRoleTable.name,
          taskRoleTable.slug,
          taskRoleTable.position,
        )
        .orderBy(asc(taskMemberTable.taskId), asc(taskRoleTable.position))
    : [];

  const byTask = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byTask.get(row.taskId) ?? [];
    list.push(row);
    byTask.set(row.taskId, list);
  }

  return {
    summaries: ids.map((taskId) => ({
      taskId,
      ...summarizeRoleCounts(byTask.get(taskId) ?? []),
    })),
  };
}

export default getTaskMemberSummaries;
