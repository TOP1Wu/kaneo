import { and, eq, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import {
  orgUnitMemberTable,
  orgUnitTable,
  workspaceUserTable,
} from "../../database/schema";
import { getOrgUnit } from "./list-org-units";

export async function replaceOrgUnitMembers(
  workspaceId: string,
  id: string,
  members: { userId: string; isLeader: boolean }[],
) {
  const userIds = members.map((member) => member.userId);
  if (new Set(userIds).size !== userIds.length) {
    throw new HTTPException(400, { message: "Each user may appear only once" });
  }

  await db.transaction(async (tx) => {
    const [unit] = await tx
      .select({ id: orgUnitTable.id })
      .from(orgUnitTable)
      .where(
        and(eq(orgUnitTable.id, id), eq(orgUnitTable.workspaceId, workspaceId)),
      )
      .for("update")
      .limit(1);
    if (!unit) throw new HTTPException(404, { message: "Org unit not found" });

    if (userIds.length > 0) {
      const found = await tx
        .select({ userId: workspaceUserTable.userId })
        .from(workspaceUserTable)
        .where(
          and(
            eq(workspaceUserTable.workspaceId, workspaceId),
            inArray(workspaceUserTable.userId, userIds),
          ),
        );
      if (found.length !== userIds.length) {
        throw new HTTPException(400, {
          message: "Every member must belong to this workspace",
        });
      }
    }

    await tx
      .delete(orgUnitMemberTable)
      .where(eq(orgUnitMemberTable.orgUnitId, id));
    if (members.length > 0) {
      await tx.insert(orgUnitMemberTable).values(
        members.map((member) => ({
          orgUnitId: id,
          userId: member.userId,
          isLeader: member.isLeader,
        })),
      );
    }
  });

  const unit = await getOrgUnit(id);
  if (!unit) throw new HTTPException(404, { message: "Org unit not found" });
  return unit;
}
