import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { orgUnitTable } from "../../database/schema";
import { wouldCreateCycle } from "../collect-subtree-ids";
import { lockOrgStructure } from "../lock-org-structure";
import { getOrgUnit } from "./list-org-units";

export async function updateOrgUnit(
  workspaceId: string,
  id: string,
  input: { name?: string; parentId?: string | null; position?: number },
) {
  await db.transaction(async (tx) => {
    await lockOrgStructure(tx, workspaceId);
    const units = await tx
      .select({ id: orgUnitTable.id, parentId: orgUnitTable.parentId })
      .from(orgUnitTable)
      .where(eq(orgUnitTable.workspaceId, workspaceId));
    if (!units.some((unit) => unit.id === id)) {
      throw new HTTPException(404, { message: "Org unit not found" });
    }

    if (input.parentId !== undefined && input.parentId !== null) {
      if (!units.some((unit) => unit.id === input.parentId)) {
        throw new HTTPException(400, {
          message: "Parent unit not found in this workspace",
        });
      }
      if (wouldCreateCycle(units, id, input.parentId)) {
        throw new HTTPException(400, {
          message: "A unit can't move under itself or one of its descendants",
        });
      }
    }

    const changes = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
    };
    if (Object.keys(changes).length > 0) {
      await tx.update(orgUnitTable).set(changes).where(eq(orgUnitTable.id, id));
    }
  });

  const unit = await getOrgUnit(id);
  if (!unit) throw new HTTPException(404, { message: "Org unit not found" });
  return unit;
}
