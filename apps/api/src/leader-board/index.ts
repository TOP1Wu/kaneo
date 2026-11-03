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
import { getLeaderBoard } from "./controllers/get-leader-board";
import { leaderBoardSchema } from "./response";
import { leaderBoardParam, leaderBoardQuery } from "./schema";

const getLeaderBoardRoute = createRoute({
  method: "get",
  operationId: "getLeaderBoard",
  path: "/{workspaceId}",
  tags: ["Leader Board"],
  summary: "Get leader board",
  description:
    "One column per person in the scope, with their open tasks across every active project of the workspace. A task belongs to a person when they are its assignee or one of its members; completed and archived tasks are left out. Leaders also see their subordinates' tasks in projects they can't open themselves. Each person carries at most 100 cards; counts cover all of their matching tasks.",
  middleware: [
    workspaceAccess.fromParam(),
    requireWorkspacePermission(BOARD_READ_PERMISSION),
  ] as const,
  request: { params: leaderBoardParam, query: leaderBoardQuery },
  responses: {
    200: jsonResponse("The leader board", leaderBoardSchema),
    400: errorResponse("Invalid query, or scope=unit without unitId"),
    403: errorResponse(
      "Missing project:read or task:read, or not allowed to use this scope",
    ),
    404: errorResponse("Workspace or org unit not found"),
  },
});

const leaderBoard = apiRouter().openapi(getLeaderBoardRoute, async (c) =>
  c.json(
    await getLeaderBoard({
      workspaceId: c.req.valid("param").workspaceId,
      actorId: c.get("userId"),
      isInstanceAdmin: await isInstanceAdmin(c),
      query: c.req.valid("query"),
    }),
    200,
  ),
);

export default leaderBoard;
