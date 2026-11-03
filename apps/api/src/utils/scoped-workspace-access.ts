import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { assertProjectAccess } from "../project-access/assert-project-access";
import { validateWorkspaceAccess } from "./validate-workspace-access";

export type ResolvedScope = { workspaceId: string; projectIds: string[] };

/**
 * Same checks as `workspaceAccessMiddleware`, for resources it doesn't know
 * how to look up. Runs before the validators, so `lookup` reads the raw request.
 */
export function scopedWorkspaceAccess(
  lookup: (c: Context) => Promise<ResolvedScope | null>,
  notFoundMessage: string,
) {
  return async (c: Context, next: Next) => {
    const userId = c.get("userId");
    if (!userId) throw new HTTPException(401, { message: "Unauthorized" });

    const scope = await lookup(c);
    if (!scope) throw new HTTPException(404, { message: notFoundMessage });

    await validateWorkspaceAccess(
      userId,
      scope.workspaceId,
      c.get("apiKey")?.id,
      {
        notFoundMessage,
      },
    );
    await assertProjectAccess(userId, scope.projectIds);

    c.set("workspaceId", scope.workspaceId);
    return next();
  };
}
