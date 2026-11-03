import {
  apiRouter,
  createRoute,
  errorResponse,
  jsonResponse,
} from "../openapi";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import createTaskRole from "./controllers/create-task-role";
import listTaskRoles from "./controllers/list-task-roles";
import updateTaskRole from "./controllers/update-task-role";
import { taskRoleListSchema, taskRoleSchema } from "./response";
import {
  createTaskRoleBody,
  taskRoleIdParam,
  updateTaskRoleBody,
  workspaceIdParam,
} from "./schema";
import { workspaceAccessFromTaskRole } from "./task-role-access";

// Role management reuses the workspace settings permission owners and admins hold.
const MANAGE_ROLES = { workspace: ["manage_settings"] };

const listTaskRolesRoute = createRoute({
  method: "get",
  operationId: "listTaskRoles",
  path: "/{workspaceId}",
  tags: ["Task Roles"],
  summary: "List task roles",
  description:
    "List the workspace's task member roles, archived ones included, ordered by position.",
  middleware: [
    workspaceAccess.fromParam("workspaceId"),
    requireWorkspacePermission({ workspace: ["read"] }),
  ] as const,
  request: { params: workspaceIdParam },
  responses: {
    200: jsonResponse("The workspace's task roles", taskRoleListSchema),
    403: errorResponse("Missing workspace:read permission"),
    404: errorResponse("Workspace not found"),
  },
});

const createTaskRoleRoute = createRoute({
  method: "post",
  operationId: "createTaskRole",
  path: "/{workspaceId}",
  tags: ["Task Roles"],
  summary: "Create task role",
  description:
    "Add a task member role to the workspace, appended after the existing roles.",
  middleware: [
    workspaceAccess.fromParam("workspaceId"),
    requireWorkspacePermission(MANAGE_ROLES),
  ] as const,
  request: {
    params: workspaceIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: createTaskRoleBody } },
    },
  },
  responses: {
    200: jsonResponse("The created task role", taskRoleSchema),
    400: errorResponse("Invalid body"),
    403: errorResponse("Missing workspace:manage_settings permission"),
    404: errorResponse("Workspace not found"),
  },
});

const updateTaskRoleRoute = createRoute({
  method: "put",
  operationId: "updateTaskRole",
  path: "/{id}",
  tags: ["Task Roles"],
  summary: "Update task role",
  description:
    "Rename, recolor, reorder, archive, or restore a task role. Archived roles keep their members and history; the workspace's only owner role can't be archived.",
  middleware: [
    workspaceAccessFromTaskRole("id"),
    requireWorkspacePermission(MANAGE_ROLES),
  ] as const,
  request: {
    params: taskRoleIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: updateTaskRoleBody } },
    },
  },
  responses: {
    200: jsonResponse("The updated task role", taskRoleSchema),
    400: errorResponse("Invalid body, or archiving the only owner role"),
    403: errorResponse("Missing workspace:manage_settings permission"),
    404: errorResponse("Task role not found"),
  },
});

const taskRole = apiRouter()
  .openapi(listTaskRolesRoute, async (c) =>
    c.json(await listTaskRoles(c.req.valid("param").workspaceId), 200),
  )
  .openapi(createTaskRoleRoute, async (c) =>
    c.json(
      await createTaskRole(
        c.req.valid("param").workspaceId,
        c.req.valid("json"),
      ),
      200,
    ),
  )
  .openapi(updateTaskRoleRoute, async (c) =>
    c.json(
      await updateTaskRole(c.req.valid("param").id, c.req.valid("json")),
      200,
    ),
  );

export default taskRole;
