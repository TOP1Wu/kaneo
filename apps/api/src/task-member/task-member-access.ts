import { eq, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import { projectTable, taskMemberTable, taskTable } from "../database/schema";
import { scopedWorkspaceAccess } from "../utils/scoped-workspace-access";
import { parseTaskIds } from "./parse-task-ids";

export const workspaceAccessFromTaskMember = (idKey = "memberId") =>
  scopedWorkspaceAccess(async (c) => {
    const id = c.req.param(idKey);
    if (!id) return null;
    const [row] = await db
      .select({
        workspaceId: projectTable.workspaceId,
        projectId: projectTable.id,
      })
      .from(taskMemberTable)
      .innerJoin(taskTable, eq(taskMemberTable.taskId, taskTable.id))
      .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
      .where(eq(taskMemberTable.id, id))
      .limit(1);
    return row
      ? { workspaceId: row.workspaceId, projectIds: [row.projectId] }
      : null;
  }, "Task member not found");

// Every listed task must sit in one workspace and in projects the caller can see.
export const workspaceAccessFromTaskIdsQuery = (key = "taskIds") =>
  scopedWorkspaceAccess(async (c) => {
    const ids = parseTaskIds(c.req.query(key));
    const tasks = await db
      .select({
        workspaceId: projectTable.workspaceId,
        projectId: projectTable.id,
      })
      .from(taskTable)
      .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
      .where(inArray(taskTable.id, ids));
    const workspaceIds = [...new Set(tasks.map((task) => task.workspaceId))];
    if (workspaceIds.length > 1)
      throw new HTTPException(400, {
        message: "All tasks must belong to the same workspace",
      });
    const [workspaceId] = workspaceIds;
    return workspaceId
      ? {
          workspaceId,
          projectIds: [...new Set(tasks.map((task) => task.projectId))],
        }
      : null;
  }, "No tasks found");
