import { BOARD_READ_PERMISSION } from "../org-unit/permissions";
import {
  apiRouter,
  createRoute,
  errorResponse,
  jsonResponse,
} from "../openapi";
import { isInstanceAdmin } from "../utils/is-instance-admin";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import { getDashboard } from "./controllers/get-dashboard";
import { dashboardSchema } from "./response";
import { dashboardParam, dashboardQuery } from "./schema";

const getDashboardRoute = createRoute({
  method: "get",
  operationId: "getDashboard",
  path: "/{workspaceId}",
  tags: ["Dashboard"],
  summary: "Get dashboard",
  description:
    "Metrics over the tasks that people in the scope take part in (as assignee or member), across every active project of the workspace. Each task counts once; archived tasks are left out. Leaders also see their subordinates' tasks in projects they can't open themselves.",
  middleware: [
    workspaceAccess.fromParam(),
    requireWorkspacePermission(BOARD_READ_PERMISSION),
  ] as const,
  request: { params: dashboardParam, query: dashboardQuery },
  responses: {
    200: jsonResponse("The dashboard", dashboardSchema),
    400: errorResponse("Invalid query, or scope=unit without unitId"),
    403: errorResponse(
      "Missing project:read or task:read, or not allowed to use this scope",
    ),
    404: errorResponse("Workspace or org unit not found"),
  },
});

const dashboard = apiRouter().openapi(getDashboardRoute, async (c) =>
  c.json(
    await getDashboard({
      workspaceId: c.req.valid("param").workspaceId,
      actorId: c.get("userId"),
      isInstanceAdmin: await isInstanceAdmin(c),
      query: c.req.valid("query"),
    }),
    200,
  ),
);

export default dashboard;
