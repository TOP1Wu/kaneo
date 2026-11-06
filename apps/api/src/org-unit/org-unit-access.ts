import { eq } from "drizzle-orm";
import db from "../database";
import { orgUnitTable } from "../database/schema";
import { scopedWorkspaceAccess } from "../utils/scoped-workspace-access";

const NOT_FOUND = "Org unit not found";

/**
 * Resolves the workspace from the `:id` path param of an org unit route. Runs
 * before validators (createRoute middleware), so it reads the raw param.
 * Members of other workspaces get the same 404 as a missing unit.
 */
export const orgUnitAccess = scopedWorkspaceAccess(async (c) => {
  const id = c.req.param("id");
  if (!id) return null;
  const [unit] = await db
    .select({ workspaceId: orgUnitTable.workspaceId })
    .from(orgUnitTable)
    .where(eq(orgUnitTable.id, id))
    .limit(1);
  return unit ? { workspaceId: unit.workspaceId, projectIds: [] } : null;
}, NOT_FOUND);
