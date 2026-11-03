import { sql } from "drizzle-orm";
import db from "../database";

export type LedUnitIds = {
  /** Units where the user is marked as a leader. */
  direct: string[];
  /** The direct units plus all of their descendants. */
  subtree: string[];
};

export async function getLedUnitIds(
  workspaceId: string,
  userId: string,
): Promise<LedUnitIds> {
  const result = await db.execute<{ id: string; direct: boolean }>(sql`
    WITH RECURSIVE led_unit AS (
      SELECT unit.id, true AS direct
      FROM org_unit AS unit
      JOIN org_unit_member AS lead ON lead.org_unit_id = unit.id
      JOIN workspace_member AS lead_member
        ON lead_member.workspace_id = unit.workspace_id
        AND lead_member.user_id = lead.user_id
      WHERE unit.workspace_id = ${workspaceId}
        AND lead.user_id = ${userId}
        AND lead.is_leader
      UNION
      SELECT child.id, false
      FROM org_unit AS child
      JOIN led_unit ON child.parent_id = led_unit.id
      WHERE child.workspace_id = ${workspaceId}
    )
    SELECT id, bool_or(direct) AS direct
    FROM led_unit
    GROUP BY id
    ORDER BY id
  `);
  return {
    direct: result.rows.filter((row) => row.direct).map((row) => row.id),
    subtree: result.rows.map((row) => row.id),
  };
}
