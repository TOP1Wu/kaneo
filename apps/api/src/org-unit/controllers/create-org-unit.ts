import { and, eq, isNull, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { orgUnitTable } from "../../database/schema";
import { lockOrgStructure } from "../lock-org-structure";
import { getOrgUnit } from "./list-org-units";

export async function createOrgUnit(
  workspaceId: string,
  input: { name: string; parentId?: string | null },
) {
  const parentId = input.parentId ?? null;
  const id = await db.transaction(async (tx) => {
    await lockOrgStructure(tx, workspaceId);
    if (parentId) {
      const [parent] = await tx
        .select({ id: orgUnitTable.id })
        .from(orgUnitTable)
        .where(
          and(
            eq(orgUnitTable.id, parentId),
            eq(orgUnitTable.workspaceId, workspaceId),
          ),
        )
        .limit(1);
      if (!parent) {
        throw new HTTPException(400, {
          message: "Parent unit not found in this workspace",
        });
      }
    }

    const [last] = await tx
      .select({
        position: sql<number>`coalesce(max(${orgUnitTable.position}), -1)`,
      })
      .from(orgUnitTable)
      .where(
        and(
          eq(orgUnitTable.workspaceId, workspaceId),
          parentId
            ? eq(orgUnitTable.parentId, parentId)
            : isNull(orgUnitTable.parentId),
        ),
      );
    const [unit] = await tx
      .insert(orgUnitTable)
      .values({
        workspaceId,
        parentId,
        name: input.name,
        position: Number(last?.position ?? -1) + 1,
      })
      .returning({ id: orgUnitTable.id });
    return unit?.id;
  });

  const unit = id ? await getOrgUnit(id) : null;
  if (!unit) {
    throw new HTTPException(500, { message: "Failed to create org unit" });
  }
  return unit;
}
