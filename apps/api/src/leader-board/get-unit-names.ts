import { and, asc, eq, sql } from "drizzle-orm";
import db from "../database";
import { orgUnitMemberTable, orgUnitTable } from "../database/schema";

/** Names of the workspace units each person belongs to, in one query. */
export async function getUnitNames(
  workspaceId: string,
  userIds: readonly string[],
): Promise<Map<string, string[]>> {
  const names = new Map<string, string[]>();
  if (userIds.length === 0) return names;

  const rows = await db
    .select({ userId: orgUnitMemberTable.userId, name: orgUnitTable.name })
    .from(orgUnitMemberTable)
    .innerJoin(orgUnitTable, eq(orgUnitTable.id, orgUnitMemberTable.orgUnitId))
    .where(
      and(
        eq(orgUnitTable.workspaceId, workspaceId),
        sql`${orgUnitMemberTable.userId} = ANY(${sql.param([...userIds])}::text[])`,
      ),
    )
    .orderBy(asc(orgUnitTable.position), asc(orgUnitTable.name));

  for (const row of rows) {
    const list = names.get(row.userId) ?? [];
    list.push(row.name);
    names.set(row.userId, list);
  }
  return names;
}
