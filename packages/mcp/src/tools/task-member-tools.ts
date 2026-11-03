import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { getCurrentUser } from "./get-current-user.js";
import type { ToolClient } from "./register.js";

type RegisterTool = <S extends z.ZodObject>(
  name: string,
  config: { description: string; inputSchema: S },
  callback: (args: z.output<S>) => Promise<CallToolResult>,
) => unknown;

type Run = (fn: () => Promise<unknown>) => Promise<CallToolResult>;

type TaskMember = {
  id: string;
  userId: string;
  roleId: string;
  roleSlug: string;
  roleName: string;
};
type TaskMembers = { members: TaskMember[] };
type TaskRole = { id: string; slug: string; name: string; archived: boolean };

const nonEmptyString = z.string().trim().min(1);
const progressSchema = z.enum(["todo", "doing", "done"]);
const memberPath = (taskId: string) =>
  `/api/task-member/task/${encodeURIComponent(taskId)}`;

async function resolveRoleId(
  client: ToolClient,
  args: { roleId?: string; role?: string; workspaceId?: string },
) {
  if (args.roleId) return args.roleId;
  if (!args.role || !args.workspaceId)
    throw new Error("Provide roleId, or role together with workspaceId");
  const wanted = args.role.toLowerCase();
  const { roles } = await client.json<{ roles: TaskRole[] }>(
    `/api/task-role/${encodeURIComponent(args.workspaceId)}`,
    { method: "GET" },
  );
  const match = roles.find(
    (role) =>
      !role.archived &&
      (role.slug.toLowerCase() === wanted ||
        role.name.toLowerCase() === wanted),
  );
  if (!match) throw new Error(`No active task role named "${args.role}"`);
  return match.id;
}

/** Task member tools: list, add, remove, and set your own (or another's) progress. */
export function registerTaskMemberTools(
  registerTool: RegisterTool,
  client: ToolClient,
  run: Run,
): void {
  registerTool(
    "list_task_members",
    {
      description:
        "List a task's members with their roles and progress (todo/doing/done), per-role done counts, and readyForReview (true once every member is done).",
      inputSchema: z.object({ taskId: nonEmptyString }),
    },
    async (args) =>
      run(() => client.json(memberPath(args.taskId), { method: "GET" })),
  );

  registerTool(
    "add_task_member",
    {
      description:
        "Add one or more workspace members to a task under a role. Pass roleId, or role (a slug such as owner, product, dev, qa, or the role's name) with workspaceId. Existing memberships are skipped. The first primary owner becomes the task's assignee.",
      inputSchema: z.object({
        taskId: nonEmptyString,
        userIds: z.array(nonEmptyString).min(1).max(100),
        roleId: nonEmptyString.optional(),
        role: nonEmptyString.optional().describe("Role slug or name"),
        workspaceId: nonEmptyString
          .optional()
          .describe("Needed to look up role by slug or name"),
      }),
    },
    async (args) =>
      run(async () =>
        client.json(memberPath(args.taskId), {
          method: "POST",
          body: JSON.stringify({
            roleId: await resolveRoleId(client, args),
            userIds: args.userIds,
          }),
        }),
      ),
  );

  registerTool(
    "remove_task_member",
    {
      description:
        "Remove a membership from a task by its member ID (from list_task_members).",
      inputSchema: z.object({ memberId: nonEmptyString }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/task-member/${encodeURIComponent(args.memberId)}`, {
          method: "DELETE",
        }),
      ),
  );

  registerTool(
    "update_task_member_progress",
    {
      description:
        "Set a member's progress on a task: todo, doing, or done, with an optional note. Pass memberId, or taskId alone to update your own membership (add role when you hold more than one). Updating someone else's row is recorded as done on their behalf.",
      inputSchema: z.object({
        progress: progressSchema,
        note: z.string().max(2000).nullable().optional(),
        memberId: nonEmptyString.optional(),
        taskId: nonEmptyString.optional(),
        role: nonEmptyString
          .optional()
          .describe("Role slug or name, to pick one of your memberships"),
      }),
    },
    async (args) =>
      run(async () => {
        const memberId = args.memberId ?? (await findOwnMemberId(client, args));
        return client.json(`/api/task-member/${encodeURIComponent(memberId)}`, {
          method: "PATCH",
          body: JSON.stringify({
            progress: args.progress,
            ...(args.note === undefined ? {} : { note: args.note }),
          }),
        });
      }),
  );
}

async function findOwnMemberId(
  client: ToolClient,
  args: { taskId?: string; role?: string },
) {
  if (!args.taskId) throw new Error("Provide memberId or taskId");
  const me = await getCurrentUser(client);
  if (!me) throw new Error("Not signed in");
  const { members } = await client.json<TaskMembers>(memberPath(args.taskId), {
    method: "GET",
  });
  const wanted = args.role?.toLowerCase();
  const mine = members.filter(
    (member) =>
      member.userId === me.id &&
      (!wanted ||
        member.roleSlug.toLowerCase() === wanted ||
        member.roleName.toLowerCase() === wanted),
  );
  if (mine.length === 0)
    throw new Error("You aren't a member of this task with that role");
  if (mine.length > 1)
    throw new Error(
      "You hold several roles on this task; pass role or memberId",
    );
  return (mine[0] as TaskMember).id;
}
