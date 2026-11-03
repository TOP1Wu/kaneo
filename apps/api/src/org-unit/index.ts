import {
  apiRouter,
  type BaseVariables,
  createRoute,
  errorResponse,
  jsonResponse,
} from "../openapi";
import { isInstanceAdmin } from "../utils/is-instance-admin";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import { createOrgUnit } from "./controllers/create-org-unit";
import { deleteOrgUnit } from "./controllers/delete-org-unit";
import { getMyScope } from "./controllers/get-my-scope";
import { listOrgUnits } from "./controllers/list-org-units";
import { replaceOrgUnitMembers } from "./controllers/replace-org-unit-members";
import { updateOrgUnit } from "./controllers/update-org-unit";
import { orgUnitAccess } from "./org-unit-access";
import { ORG_ADMIN_PERMISSION, ORG_READ_PERMISSION } from "./permissions";
import {
  deletedOrgUnitSchema,
  orgScopeSchema,
  orgUnitListSchema,
  orgUnitSchema,
} from "./response";
import {
  createOrgUnitBody,
  orgUnitIdParam,
  replaceOrgUnitMembersBody,
  updateOrgUnitBody,
  workspaceIdParam,
} from "./schema";

const TAGS = ["Org Units"];
const ADMIN_ONLY =
  "Requires workspace:manage_settings (workspace owners and admins) or instance admin.";

const listRoute = createRoute({
  method: "get",
  operationId: "listOrgUnits",
  path: "/{workspaceId}",
  tags: TAGS,
  summary: "List org units",
  description:
    "Every org unit in the workspace with its members, as a flat list ordered by position. Any workspace member can read it.",
  middleware: [
    workspaceAccess.fromParam(),
    requireWorkspacePermission(ORG_READ_PERMISSION),
  ] as const,
  request: { params: workspaceIdParam },
  responses: {
    200: jsonResponse("The workspace's org units", orgUnitListSchema),
    403: errorResponse("Missing workspace:read permission"),
    404: errorResponse("Workspace not found"),
  },
});

const myScopeRoute = createRoute({
  method: "get",
  operationId: "getMyOrgScope",
  path: "/{workspaceId}/my-scope",
  tags: TAGS,
  summary: "Get my org scope",
  description:
    "What the caller can see through the org structure: admin flags, the units they lead, and everyone below them (recursively), excluding themselves.",
  middleware: [
    workspaceAccess.fromParam(),
    requireWorkspacePermission(ORG_READ_PERMISSION),
  ] as const,
  request: { params: workspaceIdParam },
  responses: {
    200: jsonResponse("The caller's org scope", orgScopeSchema),
    403: errorResponse("Missing workspace:read permission"),
    404: errorResponse("Workspace not found"),
  },
});

const createRouteDef = createRoute({
  method: "post",
  operationId: "createOrgUnit",
  path: "/{workspaceId}",
  tags: TAGS,
  summary: "Create org unit",
  description: `Create a unit at the end of its siblings. ${ADMIN_ONLY}`,
  middleware: [
    workspaceAccess.fromParam(),
    requireWorkspacePermission(ORG_ADMIN_PERMISSION),
  ] as const,
  request: {
    params: workspaceIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: createOrgUnitBody } },
    },
  },
  responses: {
    200: jsonResponse("The created unit", orgUnitSchema),
    400: errorResponse("Invalid body, or the parent is not in this workspace"),
    403: errorResponse("Missing workspace:manage_settings permission"),
    404: errorResponse("Workspace not found"),
  },
});

const updateRoute = createRoute({
  method: "put",
  operationId: "updateOrgUnit",
  path: "/{id}",
  tags: TAGS,
  summary: "Update org unit",
  description: `Rename, move, or reorder a unit. ${ADMIN_ONLY}`,
  middleware: [
    orgUnitAccess,
    requireWorkspacePermission(ORG_ADMIN_PERMISSION),
  ] as const,
  request: {
    params: orgUnitIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: updateOrgUnitBody } },
    },
  },
  responses: {
    200: jsonResponse("The updated unit", orgUnitSchema),
    400: errorResponse(
      "Invalid body, a parent outside the workspace, or a move under the unit itself or its descendants",
    ),
    403: errorResponse("Missing workspace:manage_settings permission"),
    404: errorResponse("Org unit not found"),
  },
});

const deleteRoute = createRoute({
  method: "delete",
  operationId: "deleteOrgUnit",
  path: "/{id}",
  tags: TAGS,
  summary: "Delete org unit",
  description: `Delete a unit without child units, with its memberships. ${ADMIN_ONLY}`,
  middleware: [
    orgUnitAccess,
    requireWorkspacePermission(ORG_ADMIN_PERMISSION),
  ] as const,
  request: { params: orgUnitIdParam },
  responses: {
    200: jsonResponse("The deleted unit", deletedOrgUnitSchema),
    403: errorResponse("Missing workspace:manage_settings permission"),
    404: errorResponse("Org unit not found"),
    409: errorResponse("The unit still has child units"),
  },
});

const replaceMembersRoute = createRoute({
  method: "put",
  operationId: "replaceOrgUnitMembers",
  path: "/{id}/members",
  tags: TAGS,
  summary: "Replace org unit members",
  description: `Replace the unit's whole member list and leader flags. ${ADMIN_ONLY}`,
  middleware: [
    orgUnitAccess,
    requireWorkspacePermission(ORG_ADMIN_PERMISSION),
  ] as const,
  request: {
    params: orgUnitIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: replaceOrgUnitMembersBody } },
    },
  },
  responses: {
    200: jsonResponse("The unit with its new members", orgUnitSchema),
    400: errorResponse(
      "Invalid body, a duplicate user, or a user who is not a workspace member",
    ),
    403: errorResponse("Missing workspace:manage_settings permission"),
    404: errorResponse("Org unit not found"),
  },
});

const orgUnit = apiRouter<BaseVariables & { workspaceId: string }>()
  .openapi(listRoute, async (c) =>
    c.json(await listOrgUnits(c.req.valid("param").workspaceId), 200),
  )
  .openapi(myScopeRoute, async (c) =>
    c.json(
      await getMyScope(
        c.req.valid("param").workspaceId,
        c.get("userId"),
        await isInstanceAdmin(c),
      ),
      200,
    ),
  )
  .openapi(createRouteDef, async (c) =>
    c.json(
      await createOrgUnit(
        c.req.valid("param").workspaceId,
        c.req.valid("json"),
      ),
      200,
    ),
  )
  .openapi(updateRoute, async (c) =>
    c.json(
      await updateOrgUnit(
        c.get("workspaceId"),
        c.req.valid("param").id,
        c.req.valid("json"),
      ),
      200,
    ),
  )
  .openapi(deleteRoute, async (c) =>
    c.json(
      await deleteOrgUnit(c.get("workspaceId"), c.req.valid("param").id),
      200,
    ),
  )
  .openapi(replaceMembersRoute, async (c) =>
    c.json(
      await replaceOrgUnitMembers(
        c.get("workspaceId"),
        c.req.valid("param").id,
        c.req.valid("json").members,
      ),
      200,
    ),
  );

export default orgUnit;
