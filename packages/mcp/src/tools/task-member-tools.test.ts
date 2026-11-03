import { describe, expect, it, vi } from "vite-plus/test";
import { registerTools } from "./register.js";

type Handler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}>;

function setup(responses: Record<string, unknown>) {
  const tools = new Map<string, Handler>();
  const server = {
    registerTool: (name: string, _config: unknown, handler: Handler) => {
      tools.set(name, handler);
    },
  };
  const client = {
    usingApiKey: true,
    json: vi.fn(async (path: string, init?: RequestInit) => {
      const key = `${init?.method ?? "GET"} ${path}`;
      if (!(key in responses)) throw new Error(`unexpected ${key}`);
      return responses[key];
    }),
  };
  registerTools(server as never, { client: client as never });
  const call = async (name: string, args: Record<string, unknown>) => {
    const result = await tools.get(name)?.(args);
    return { ...result, data: JSON.parse(result?.content[0]?.text ?? "null") };
  };
  return { client, call, tools };
}

const view = {
  members: [
    {
      id: "m1",
      userId: "me",
      userName: "Me",
      roleId: "r-dev",
      roleSlug: "dev",
      roleName: "开发",
      progress: "doing",
    },
    {
      id: "m2",
      userId: "me",
      userName: "Me",
      roleId: "r-qa",
      roleSlug: "qa",
      roleName: "测试",
      progress: "todo",
    },
  ],
  summary: [{ roleId: "r-dev", total: 1, done: 0 }],
  readyForReview: false,
};

describe("task member tools", () => {
  it("registers the four member tools", () => {
    const { tools } = setup({});
    for (const name of [
      "list_task_members",
      "add_task_member",
      "remove_task_member",
      "update_task_member_progress",
    ])
      expect(tools.has(name)).toBe(true);
  });

  it("resolves a role slug through the workspace's roles", async () => {
    const { client, call } = setup({
      "GET /api/task-role/ws-1": {
        roles: [
          { id: "r-old", slug: "dev", name: "开发", archived: true },
          { id: "r-dev", slug: "dev-2", name: "开发", archived: false },
        ],
      },
      "POST /api/task-member/task/t-1": view,
    });
    const result = await call("add_task_member", {
      taskId: "t-1",
      userIds: ["u-1"],
      role: "开发",
      workspaceId: "ws-1",
    });
    expect(result.isError).toBe(false);
    expect(client.json).toHaveBeenLastCalledWith("/api/task-member/task/t-1", {
      method: "POST",
      body: JSON.stringify({ roleId: "r-dev", userIds: ["u-1"] }),
    });
  });

  it("asks for a role when none can be resolved", async () => {
    const { call } = setup({});
    const result = await call("add_task_member", {
      taskId: "t-1",
      userIds: ["u-1"],
    });
    expect(result.isError).toBe(true);
    expect(result.data.error).toContain("roleId");
  });

  it("updates the caller's own membership, picking the role when they hold several", async () => {
    const { client, call } = setup({
      "GET /api/user/me": { id: "me", name: "Me", email: "me@example.com" },
      "GET /api/task-member/task/t-1": view,
      "PATCH /api/task-member/m2": view,
    });
    const ambiguous = await call("update_task_member_progress", {
      taskId: "t-1",
      progress: "done",
    });
    expect(ambiguous.isError).toBe(true);

    const result = await call("update_task_member_progress", {
      taskId: "t-1",
      role: "qa",
      progress: "done",
      note: "verified",
    });
    expect(result.isError).toBe(false);
    expect(client.json).toHaveBeenLastCalledWith("/api/task-member/m2", {
      method: "PATCH",
      body: JSON.stringify({ progress: "done", note: "verified" }),
    });
  });

  it("adds a members summary to get_task, and tolerates servers without members", async () => {
    const withMembers = setup({
      "GET /api/task/t-1": { id: "t-1", title: "Task" },
      "GET /api/task-member/task/t-1": view,
    });
    const result = await withMembers.call("get_task", { taskId: "t-1" });
    expect(result.data).toMatchObject({
      id: "t-1",
      members: {
        readyForReview: false,
        members: [
          { id: "m1", userName: "Me", roleName: "开发", progress: "doing" },
          { id: "m2", userName: "Me", roleName: "测试", progress: "todo" },
        ],
      },
    });

    const legacy = setup({ "GET /api/task/t-1": { id: "t-1", title: "Task" } });
    expect((await legacy.call("get_task", { taskId: "t-1" })).data).toEqual({
      id: "t-1",
      title: "Task",
      members: null,
    });
  });
});
