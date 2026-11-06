import { sql } from "drizzle-orm";
import db from "../database";

export type LedUnits = {
  /** Units where the user is marked as a leader. */
  direct: string[];
  /** The direct units plus all of their descendants. */
  subtree: string[];
  /** Current members of the subtree, excluding the user. */
  subordinateUserIds: string[];
};

/**
 * Everything one org leader's position grants, in a single query: the units
 * they lead, those units' subtrees, and the people in them. Both callers need
 * all three, so the recursive walk runs once. Only current workspace members
 * count, and `UNION` stops the walk on a corrupted parent cycle.
 */
export async function getLedUnits(
  workspaceId: string,
  userId: string,
): Promise<LedUnits> {
  const result = await db.execute<{
    direct: string[];
    subtree: string[];
    subordinateUserIds: string[];
  }>(sql`
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
    ),
    people AS (
      SELECT DISTINCT unit_member.user_id
      FROM org_unit_member AS unit_member
      JOIN led_unit ON led_unit.id = unit_member.org_unit_id
      JOIN workspace_member AS current_member
        ON current_member.workspace_id = ${workspaceId}
        AND current_member.user_id = unit_member.user_id
      WHERE unit_member.user_id <> ${userId}
    )
    SELECT
      ARRAY(SELECT DISTINCT id FROM led_unit WHERE direct ORDER BY id) AS "direct",
      ARRAY(SELECT DISTINCT id FROM led_unit ORDER BY id) AS "subtree",
      ARRAY(SELECT user_id FROM people ORDER BY user_id) AS "subordinateUserIds"
  `);
  const [row] = result.rows;
  return row ?? { direct: [], subtree: [], subordinateUserIds: [] };
}
