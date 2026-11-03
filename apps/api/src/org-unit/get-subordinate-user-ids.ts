import { sql } from "drizzle-orm";
import db from "../database";
import type { DbOrTx } from "../project-access/db-or-tx";

/**
 * Everyone in the units `leaderId` leads and in all of their descendant units,
 * except the leader. Only current workspace members count on either side, so
 * memberships left behind by people who left the workspace grant nothing.
 * `UNION` (not `UNION ALL`) also stops the walk on a corrupted parent cycle.
 */
export async function getSubordinateUserIds(
  workspaceId: string,
  leaderId: string,
  database: DbOrTx = db,
): Promise<string[]> {
  const result = await database.execute<{ user_id: string }>(sql`
    WITH RECURSIVE led_unit AS (
      SELECT unit.id
      FROM org_unit AS unit
      JOIN org_unit_member AS lead ON lead.org_unit_id = unit.id
      JOIN workspace_member AS lead_member
        ON lead_member.workspace_id = unit.workspace_id
        AND lead_member.user_id = lead.user_id
      WHERE unit.workspace_id = ${workspaceId}
        AND lead.user_id = ${leaderId}
        AND lead.is_leader
      UNION
      SELECT child.id
      FROM org_unit AS child
      JOIN led_unit ON child.parent_id = led_unit.id
      WHERE child.workspace_id = ${workspaceId}
    )
    SELECT DISTINCT unit_member.user_id
    FROM org_unit_member AS unit_member
    JOIN led_unit ON led_unit.id = unit_member.org_unit_id
    JOIN workspace_member AS current_member
      ON current_member.workspace_id = ${workspaceId}
      AND current_member.user_id = unit_member.user_id
    WHERE unit_member.user_id <> ${leaderId}
    ORDER BY unit_member.user_id
  `);
  return result.rows.map((row) => row.user_id);
}
