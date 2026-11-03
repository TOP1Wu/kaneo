import { sql } from "drizzle-orm";
import db from "../database";

/** Current workspace members of a unit and all of its descendant units. */
export async function getUnitSubtreeUserIds(
  workspaceId: string,
  unitId: string,
): Promise<string[]> {
  const result = await db.execute<{ user_id: string }>(sql`
    WITH RECURSIVE subtree AS (
      SELECT unit.id
      FROM org_unit AS unit
      WHERE unit.id = ${unitId} AND unit.workspace_id = ${workspaceId}
      UNION
      SELECT child.id
      FROM org_unit AS child
      JOIN subtree ON child.parent_id = subtree.id
      WHERE child.workspace_id = ${workspaceId}
    )
    SELECT DISTINCT unit_member.user_id
    FROM org_unit_member AS unit_member
    JOIN subtree ON subtree.id = unit_member.org_unit_id
    JOIN workspace_member AS current_member
      ON current_member.workspace_id = ${workspaceId}
      AND current_member.user_id = unit_member.user_id
    ORDER BY unit_member.user_id
  `);
  return result.rows.map((row) => row.user_id);
}
