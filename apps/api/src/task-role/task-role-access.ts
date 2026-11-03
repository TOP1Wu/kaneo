import { eq } from "drizzle-orm";
import db from "../database";
import { taskRoleTable } from "../database/schema";
import { scopedWorkspaceAccess } from "../utils/scoped-workspace-access";

export const workspaceAccessFromTaskRole = (idKey = "id") =>
  scopedWorkspaceAccess(async (c) => {
    const id = c.req.param(idKey);
    if (!id) return null;
    const [role] = await db
      .select({ workspaceId: taskRoleTable.workspaceId })
      .from(taskRoleTable)
      .where(eq(taskRoleTable.id, id))
      .limit(1);
    return role ? { workspaceId: role.workspaceId, projectIds: [] } : null;
  }, "Task role not found");
