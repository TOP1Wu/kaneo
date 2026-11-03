import { asc, eq } from "drizzle-orm";
import db from "../../database";
import { taskRoleTable } from "../../database/schema";
import { serializeTaskRole } from "../serialize-task-role";

async function listTaskRoles(workspaceId: string) {
  const roles = await db
    .select()
    .from(taskRoleTable)
    .where(eq(taskRoleTable.workspaceId, workspaceId))
    .orderBy(
      asc(taskRoleTable.position),
      asc(taskRoleTable.createdAt),
      asc(taskRoleTable.id),
    );
  return { roles: roles.map(serializeTaskRole) };
}

export default listTaskRoles;
