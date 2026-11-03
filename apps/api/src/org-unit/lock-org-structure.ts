import { sql } from "drizzle-orm";
import type { DbOrTx } from "../project-access/db-or-tx";

/**
 * Serializes structural writes per workspace, so two concurrent moves can't
 * build a cycle and a delete can't race a new child.
 */
export async function lockOrgStructure(tx: DbOrTx, workspaceId: string) {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(2026, hashtext(${`org_unit:${workspaceId}`}))`,
  );
}
