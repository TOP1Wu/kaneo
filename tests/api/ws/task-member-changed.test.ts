import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";

vi.mock("../../../apps/api/src/events", () => ({
  subscribeToEvent: vi.fn(),
  publishEvent: vi.fn(),
}));
// Same stand-ins as broadcast.test.ts: everyone connected may read the project.
vi.mock(
  "../../../apps/api/src/project-access/filter-users-with-project-access",
  () => ({
    filterUsersWithProjectAccess: async (userIds: Iterable<string>) =>
      new Set(userIds),
  }),
);
vi.mock("../../../apps/api/src/database", () => ({
  default: {
    select: (fields: Record<string, unknown>) => ({
      from: () => ({
        where: () =>
          fields.userId
            ? Promise.resolve([{ userId: "user-1" }])
            : { limit: async () => [{ workspaceId: "workspace" }] },
      }),
    }),
  },
}));
vi.mock("../../../apps/api/src/ws/project-read-access", () => ({
  getProjectReadAccess: async (
    _workspaceId: string,
    recipients: Array<{ userId: string }>,
  ) => ({
    readers: new Set(recipients.map((conn) => conn.userId)),
    apiKeys: new Map(),
  }),
}));

import { subscribeToEvent } from "../../../apps/api/src/events";
import {
  addConnection,
  initializeWebSocketAdapter,
  removeConnection,
  shutdownWebSocketAdapter,
} from "../../../apps/api/src/ws/index";

const memberChangedHandler = vi
  .mocked(subscribeToEvent)
  .mock.calls.find(([eventName]) => eventName === "task.member_changed")?.[1];

function makeFakeWs() {
  return {
    send: vi.fn(),
    close: vi.fn(),
    readyState: 1,
    raw: undefined,
    url: null,
    protocol: null,
  } as never;
}

beforeEach(async () => {
  delete process.env.REDIS_URL;
  await initializeWebSocketAdapter();
});

afterEach(async () => {
  await shutdownWebSocketAdapter();
});

it("tells the task's project to refetch members, without member details", async () => {
  expect(memberChangedHandler).toBeDefined();
  const ws = makeFakeWs();
  const conn = addConnection("proj-1", ws, "user-1", "init-1", "workspace");

  await memberChangedHandler?.({
    taskId: "t1",
    projectId: "proj-1",
    workspaceId: "workspace",
    action: "updated",
    member: {
      id: "m1",
      userId: "user-2",
      roleId: "r1",
      roleName: "开发",
      progress: "done",
    },
    userId: "user-2",
    initiatorId: "other-window",
  });

  const send = (ws as { send: ReturnType<typeof vi.fn> }).send;
  await vi.waitFor(() => expect(send).toHaveBeenCalledOnce(), { timeout: 300 });
  expect(JSON.parse(send.mock.calls[0][0])).toMatchObject({
    type: "TASK_MEMBERS_UPDATED",
    projectId: "proj-1",
    taskId: "t1",
  });
  expect(send.mock.calls[0][0]).not.toContain("开发");
  removeConnection("proj-1", conn);
});
