import {
  apiRouter,
  createRoute,
  errorResponse,
  jsonResponse,
} from "../openapi";
import {
  requireApiKeyScope,
  requireWorkspacePermission,
} from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import {
  authorizeManageMembers,
  authorizeMemberRemoval,
  authorizeMemberUpdate,
} from "./authorize-member-change";
import addTaskMembers from "./controllers/add-task-members";
import getTaskMemberSummaries from "./controllers/get-task-member-summaries";
import getTaskMembers from "./controllers/get-task-members";
import removeTaskMember from "./controllers/remove-task-member";
import updateTaskMember from "./controllers/update-task-member";
import { parseTaskIds } from "./parse-task-ids";
import {
  deletedTaskMemberSchema,
  taskMemberSummariesSchema,
  taskMembersSchema,
} from "./response";
import {
  addTaskMembersBody,
  memberIdParam,
  summaryQuery,
  taskIdParam,
  updateTaskMemberBody,
} from "./schema";
import {
  workspaceAccessFromTaskIdsQuery,
  workspaceAccessFromTaskMember,
} from "./task-member-access";

const READ = requireWorkspacePermission({ task: ["read"] });
// Who may write is decided per member in the controller; API keys still need write scope.
const WRITE_SCOPE = requireApiKeyScope({ task: ["update"] });

const getMemberSummariesRoute = createRoute({
  method: "get",
  operationId: "getTaskMemberSummaries",
  path: "/summary",
  tags: ["Task Members"],
  summary: "Get member summaries for tasks",
  description:
    "Per-role member counts and review readiness for up to 200 tasks in one workspace, for boards and lists.",
  middleware: [workspaceAccessFromTaskIdsQuery("taskIds"), READ] as const,
  request: { query: summaryQuery },
  responses: {
    200: jsonResponse(
      "Member summaries in request order",
      taskMemberSummariesSchema,
    ),
    400: errorResponse(
      "Missing taskIds, more than 200, or tasks from several workspaces",
    ),
    403: errorResponse(
      "No access to a task's project, or missing task:read permission",
    ),
    404: errorResponse("No tasks found"),
  },
});

const getTaskMembersRoute = createRoute({
  method: "get",
  operationId: "getTaskMembers",
  path: "/task/{taskId}",
  tags: ["Task Members"],
  summary: "List task members",
  description:
    "List a task's members grouped by role order, with per-role counts and whether every member is done.",
  middleware: [workspaceAccess.fromTaskId("taskId"), READ] as const,
  request: { params: taskIdParam },
  responses: {
    200: jsonResponse("The task's members", taskMembersSchema),
    403: errorResponse(
      "No access to the project, or missing task:read permission",
    ),
    404: errorResponse("Task not found"),
  },
});

const addTaskMembersRoute = createRoute({
  method: "post",
  operationId: "addTaskMembers",
  path: "/task/{taskId}",
  tags: ["Task Members"],
  summary: "Add task members",
  description:
    "Add users to a task under one role. Users who already hold that role are skipped. Allowed for the task's primary owners, workspace admins, and anyone with task:update. Adding to the primary-owner role can change the task's assignee.",
  middleware: [
    workspaceAccess.fromTaskId("taskId"),
    READ,
    WRITE_SCOPE,
  ] as const,
  request: {
    params: taskIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: addTaskMembersBody } },
    },
  },
  responses: {
    200: jsonResponse("The task's members after the change", taskMembersSchema),
    400: errorResponse("Invalid body, or the role is archived"),
    403: errorResponse(
      "Not allowed to manage members, or a user can't access the task's project",
    ),
    404: errorResponse("Task or role not found"),
  },
});

const removeTaskMemberRoute = createRoute({
  method: "delete",
  operationId: "removeTaskMember",
  path: "/{memberId}",
  tags: ["Task Members"],
  summary: "Remove task member",
  description:
    "Remove one membership. Removing the first primary owner hands the assignee to the next one.",
  middleware: [
    workspaceAccessFromTaskMember("memberId"),
    READ,
    WRITE_SCOPE,
  ] as const,
  request: { params: memberIdParam },
  responses: {
    200: jsonResponse("The removed membership", deletedTaskMemberSchema),
    403: errorResponse("Not allowed to manage this task's members"),
    404: errorResponse("Task member not found"),
  },
});

const updateTaskMemberRoute = createRoute({
  method: "patch",
  operationId: "updateTaskMember",
  path: "/{memberId}",
  tags: ["Task Members"],
  summary: "Update task member",
  description:
    "Change a member's progress, note, role, order, or hand the seat to someone else with userId, which restarts that seat at todo. Members update their own progress and note; primary owners and workspace admins can do it on their behalf and reassign seats. Reassigning, role, and order changes need member management rights.",
  middleware: [
    workspaceAccessFromTaskMember("memberId"),
    READ,
    WRITE_SCOPE,
  ] as const,
  request: {
    params: memberIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: updateTaskMemberBody } },
    },
  },
  responses: {
    200: jsonResponse("The task's members after the change", taskMembersSchema),
    400: errorResponse("Invalid body, or the role is archived"),
    403: errorResponse("Not allowed to make this change"),
    404: errorResponse("Task member, role, or user not found"),
    409: errorResponse("The user already holds that role on this task"),
  },
});

const taskMember = apiRouter()
  .openapi(getMemberSummariesRoute, async (c) =>
    c.json(
      await getTaskMemberSummaries(parseTaskIds(c.req.valid("query").taskIds)),
      200,
    ),
  )
  .openapi(getTaskMembersRoute, async (c) =>
    c.json(await getTaskMembers(c.req.valid("param").taskId), 200),
  )
  .openapi(addTaskMembersRoute, async (c) => {
    const { taskId } = c.req.valid("param");
    const scope = await authorizeManageMembers(c, taskId);
    return c.json(
      await addTaskMembers(scope, c.req.valid("json"), c.get("userId")),
      200,
    );
  })
  .openapi(removeTaskMemberRoute, async (c) => {
    const { memberId } = c.req.valid("param");
    const scope = await authorizeMemberRemoval(c, memberId);
    return c.json(
      await removeTaskMember(scope, memberId, c.get("userId")),
      200,
    );
  })
  .openapi(updateTaskMemberRoute, async (c) => {
    const { memberId } = c.req.valid("param");
    const input = c.req.valid("json");
    const scope = await authorizeMemberUpdate(c, memberId, input);
    return c.json(
      await updateTaskMember(scope, memberId, input, c.get("userId")),
      200,
    );
  });

export default taskMember;
