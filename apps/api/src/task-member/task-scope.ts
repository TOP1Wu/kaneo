import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import { projectTable, taskTable } from "../database/schema";
import type { DbOrTx } from "../project-access/db-or-tx";

export type TaskScope = {
  taskId: string;
  projectId: string;
  workspaceId: string;
  assigneeId: string | null;
};

export async function loadTaskScope(
  taskId: string,
  database: DbOrTx = db,
): Promise<TaskScope> {
  const [scope] = await database
    .select({
      taskId: taskTable.id,
      projectId: taskTable.projectId,
      workspaceId: projectTable.workspaceId,
      assigneeId: taskTable.userId,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(eq(taskTable.id, taskId))
    .limit(1);
  if (!scope) throw new HTTPException(404, { message: "Task not found" });
  return scope;
}
