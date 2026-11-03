import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import { orgUnitTable } from "../database/schema";
import { validateWorkspaceAccess } from "../utils/validate-workspace-access";

const NOT_FOUND = "Org unit not found";

/**
 * Resolves the workspace from the `:id` path param of an org unit route. Runs
 * before validators (createRoute middleware), so it reads the raw param.
 */
export async function orgUnitAccess(c: Context, next: Next) {
  const userId = c.get("userId");
  if (!userId) throw new HTTPException(401, { message: "Unauthorized" });

  const id = c.req.param("id");
  const [unit] = id
    ? await db
        .select({ workspaceId: orgUnitTable.workspaceId })
        .from(orgUnitTable)
        .where(eq(orgUnitTable.id, id))
        .limit(1)
    : [];
  if (!unit) throw new HTTPException(404, { message: NOT_FOUND });

  // Members of other workspaces get the same 404 as a missing unit.
  await validateWorkspaceAccess(userId, unit.workspaceId, c.get("apiKey")?.id, {
    notFoundMessage: NOT_FOUND,
  });
  c.set("workspaceId", unit.workspaceId);
  return next();
}
