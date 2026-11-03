import { eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { taskRoleTable } from "../../database/schema";
import { roleSlug } from "../role-slug";
import { serializeTaskRole } from "../serialize-task-role";

async function createTaskRole(
  workspaceId: string,
  { name, color }: { name: string; color?: string | null },
) {
  const [role] = await db.transaction(async (tx) => {
    // Serialize concurrent creates so appended positions stay distinct.
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(7307, hashtext(${workspaceId}))`,
    );
    const [last] = await tx
      .select({ max: sql<number | null>`max(${taskRoleTable.position})` })
      .from(taskRoleTable)
      .where(eq(taskRoleTable.workspaceId, workspaceId));
    return tx
      .insert(taskRoleTable)
      .values({
        workspaceId,
        name,
        slug: roleSlug(name),
        color: color ?? null,
        position: (last?.max ?? -1) + 1,
        isOwnerRole: false,
      })
      .returning();
  });

  if (!role)
    throw new HTTPException(500, { message: "Failed to create task role" });
  return serializeTaskRole(role);
}

export default createTaskRole;
