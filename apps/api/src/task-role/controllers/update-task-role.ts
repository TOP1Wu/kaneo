import { and, eq, isNull, ne } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { taskRoleTable } from "../../database/schema";
import { serializeTaskRole } from "../serialize-task-role";

type UpdateTaskRoleInput = {
  name?: string;
  color?: string | null;
  position?: number;
  archived?: boolean;
};

async function updateTaskRole(id: string, input: UpdateTaskRoleInput) {
  const updated = await db.transaction(async (tx) => {
    const [role] = await tx
      .select()
      .from(taskRoleTable)
      .where(eq(taskRoleTable.id, id))
      .for("update");
    if (!role) throw new HTTPException(404, { message: "Task role not found" });

    if (input.archived === true && role.isOwnerRole) {
      // The owner role drives assignee sync, so one must always stay active.
      const [otherOwner] = await tx
        .select({ id: taskRoleTable.id })
        .from(taskRoleTable)
        .where(
          and(
            eq(taskRoleTable.workspaceId, role.workspaceId),
            eq(taskRoleTable.isOwnerRole, true),
            isNull(taskRoleTable.archivedAt),
            ne(taskRoleTable.id, role.id),
          ),
        )
        .limit(1);
      if (!otherOwner)
        throw new HTTPException(400, {
          message: "The workspace's only owner role can't be archived",
        });
    }

    const archivedAt =
      input.archived === undefined
        ? undefined
        : input.archived
          ? (role.archivedAt ?? new Date())
          : null;

    const [row] = await tx
      .update(taskRoleTable)
      .set({
        name: input.name,
        color: input.color,
        position: input.position,
        archivedAt,
      })
      .where(eq(taskRoleTable.id, id))
      .returning();
    return row;
  });

  if (!updated)
    throw new HTTPException(500, { message: "Failed to update task role" });
  return serializeTaskRole(updated);
}

export default updateTaskRole;
