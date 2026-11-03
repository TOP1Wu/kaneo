import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { orgUnitTable } from "../../database/schema";
import { lockOrgStructure } from "../lock-org-structure";

/** Deletes a leaf unit and its memberships. Units with children are refused. */
export async function deleteOrgUnit(workspaceId: string, id: string) {
  return db.transaction(async (tx) => {
    await lockOrgStructure(tx, workspaceId);
    const [child] = await tx
      .select({ id: orgUnitTable.id })
      .from(orgUnitTable)
      .where(eq(orgUnitTable.parentId, id))
      .limit(1);
    if (child) {
      throw new HTTPException(409, {
        message: "Move or delete this unit's child units first",
      });
    }

    const [deleted] = await tx
      .delete(orgUnitTable)
      .where(
        and(eq(orgUnitTable.id, id), eq(orgUnitTable.workspaceId, workspaceId)),
      )
      .returning({ id: orgUnitTable.id });
    if (!deleted)
      throw new HTTPException(404, { message: "Org unit not found" });
    return deleted;
  });
}
