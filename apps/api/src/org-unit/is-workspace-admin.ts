import { and, eq } from "drizzle-orm";
import db from "../database";
import { workspaceUserTable } from "../database/schema";
import { roleHasWorkspacePermission } from "../utils/require-workspace-permission";
import { ORG_ADMIN_PERMISSION } from "./permissions";

/** Whether the user's own workspace role administers the org structure. */
export async function isWorkspaceAdmin(
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const [member] = await db
    .select({ role: workspaceUserTable.role })
    .from(workspaceUserTable)
    .where(
      and(
        eq(workspaceUserTable.workspaceId, workspaceId),
        eq(workspaceUserTable.userId, userId),
      ),
    )
    .limit(1);
  if (!member) return false;
  return roleHasWorkspacePermission(
    workspaceId,
    member.role,
    ORG_ADMIN_PERMISSION,
  );
}
