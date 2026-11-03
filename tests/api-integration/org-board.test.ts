import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import db, { getDatabasePool, schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { leaderEditGuard } from "../../apps/api/src/leader-board/leader-edit-guard";
import { getSubordinateUserIds } from "../../apps/api/src/org-unit/get-subordinate-user-ids";
import { seedDefaultTaskRoles } from "../../apps/api/src/task-role/default-roles";
import { deleteWorkspaceData } from "../../apps/api/src/workspace/lifecycle/delete-workspace-data";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";
import { restrictToProjects } from "./helpers/project-access/restrict-to-projects";

type User = typeof schema.userTable.$inferSelect;
type Project = Awaited<ReturnType<typeof createProjectFixture>>;
type Progress = "todo" | "doing" | "done";

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

async function addPerson(workspaceId: string, name: string, role = "member") {
  const id = `user-${randomUUID()}`;
  const [user] = await db
    .insert(schema.userTable)
    .values({ id, email: `${id}@example.com`, emailVerified: true, name })
    .returning();
  await db
    .insert(schema.workspaceUserTable)
    .values({ workspaceId, userId: user.id, role, joinedAt: new Date() });
  return user;
}

async function insertUnit(
  workspaceId: string,
  name: string,
  parentId: string | null,
  members: { user: User; isLeader?: boolean }[],
) {
  const [unit] = await db
    .insert(schema.orgUnitTable)
    .values({ workspaceId, name, parentId })
    .returning();
  if (members.length > 0) {
    await db.insert(schema.orgUnitMemberTable).values(
      members.map(({ user, isLeader = false }) => ({
        orgUnitId: unit.id,
        userId: user.id,
        isLeader,
      })),
    );
  }
  return unit;
}

let taskNumber = 0;

async function addTask(
  project: Project,
  options: {
    title: string;
    column?: keyof Project["columns"];
    status?: string;
    assigneeId?: string;
    dueDate?: Date;
    priority?: string;
    createdAt?: Date;
    members?: {
      user: User;
      roleId: string;
      progress: Progress;
      updatedAt?: Date;
    }[];
  },
) {
  taskNumber += 1;
  const column = project.columns[options.column ?? "todo"];
  const [task] = await db
    .insert(schema.taskTable)
    .values({
      projectId: project.project.id,
      title: options.title,
      status: options.status ?? column.slug,
      columnId: options.status ? null : column.id,
      userId: options.assigneeId ?? null,
      number: taskNumber,
      priority: options.priority ?? "medium",
      dueDate: options.dueDate ?? null,
      ...(options.createdAt ? { createdAt: options.createdAt } : {}),
    })
    .returning();
  if (options.members?.length) {
    await db.insert(schema.taskMemberTable).values(
      options.members.map((member, position) => ({
        taskId: task.id,
        userId: member.user.id,
        roleId: member.roleId,
        progress: member.progress,
        position,
        updatedAt: member.updatedAt ?? new Date(),
      })),
    );
  }
  return task;
}

/**
 * Owner; Eng (Lena leads) > Backend (Mia leads, Sam) > nothing else.
 * Pat is in the workspace but in no unit. Lena may only open the Open project.
 */
async function seedOrg() {
  const ownerContext = await createWorkspaceMember({
    userName: "Olga Owner",
    role: "owner",
  });
  const workspaceId = ownerContext.workspace.id;
  const owner = ownerContext.user;
  const leader = await addPerson(workspaceId, "Lena Leader");
  const manager = await addPerson(workspaceId, "Mia Manager");
  const staff = await addPerson(workspaceId, "Sam Staff");
  const peer = await addPerson(workspaceId, "Pat Peer");

  await seedDefaultTaskRoles(db, workspaceId);
  const roleRows = await db
    .select()
    .from(schema.taskRoleTable)
    .where(eq(schema.taskRoleTable.workspaceId, workspaceId));
  const role = (slug: string) => {
    const found = roleRows.find((row) => row.slug === slug);
    if (!found) throw new Error(`missing role ${slug}`);
    return found.id;
  };

  const open = await createProjectFixture({
    workspaceId,
    name: "Open",
    slug: "open",
  });
  const secret = await createProjectFixture({
    workspaceId,
    name: "Secret",
    slug: "secret",
  });
  await restrictToProjects(workspaceId, leader.id, [open.project.id]);

  const eng = await insertUnit(workspaceId, "Eng", null, [
    { user: leader, isLeader: true },
  ]);
  const backend = await insertUnit(workspaceId, "Backend", eng.id, [
    { user: manager, isLeader: true },
    { user: staff },
  ]);

  return {
    workspaceId,
    owner,
    leader,
    manager,
    staff,
    peer,
    open,
    secret,
    eng,
    backend,
    roles: {
      owner: role("owner"),
      product: role("product"),
      dev: role("dev"),
      qa: role("qa"),
    },
  };
}

type App = ReturnType<typeof createApp>["app"];

async function call(
  app: App,
  user: User,
  path: string,
  init?: { method: string; body?: unknown },
) {
  mockAuthenticatedSession(user);
  return app.request(`/api${path}`, {
    method: init?.method ?? "GET",
    ...(init?.body !== undefined
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(init.body),
        }
      : {}),
  });
}

async function json<T>(response: Response, status = 200): Promise<T> {
  const body = await response.json();
  expect({ status: response.status, body }).toMatchObject({ status });
  return body as T;
}

describe("API integration: org units", () => {
  let app: App;

  beforeEach(async () => {
    await resetTestDatabase();
    app = createApp().app;
  });

  it("lets admins build the tree and every member read it", async () => {
    const org = await seedOrg();
    const sales = await json<{ id: string; parentId: string | null }>(
      await call(app, org.owner, `/org-unit/${org.workspaceId}`, {
        method: "POST",
        body: { name: " Sales " },
      }),
    );
    expect(sales.parentId).toBeNull();
    const emea = await json<{ id: string; parentId: string; name: string }>(
      await call(app, org.owner, `/org-unit/${org.workspaceId}`, {
        method: "POST",
        body: { name: "EMEA", parentId: sales.id },
      }),
    );
    expect(emea).toMatchObject({ parentId: sales.id, name: "EMEA" });

    const withMembers = await json<{ members: unknown[] }>(
      await call(app, org.owner, `/org-unit/${emea.id}/members`, {
        method: "PUT",
        body: { members: [{ userId: org.peer.id, isLeader: true }] },
      }),
    );
    expect(withMembers.members).toEqual([
      {
        userId: org.peer.id,
        userName: "Pat Peer",
        userImage: null,
        isLeader: true,
      },
    ]);

    const list = await json<{
      units: { id: string; parentId: string | null; name: string }[];
    }>(await call(app, org.staff, `/org-unit/${org.workspaceId}`));
    expect(list.units.map((unit) => unit.name).sort()).toEqual([
      "Backend",
      "EMEA",
      "Eng",
      "Sales",
    ]);

    // Members can read but not write.
    expect(
      (
        await call(app, org.staff, `/org-unit/${org.workspaceId}`, {
          method: "POST",
          body: { name: "Shadow" },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call(app, org.leader, `/org-unit/${emea.id}`, {
          method: "PUT",
          body: { name: "Renamed" },
        })
      ).status,
    ).toBe(403);
  });

  it("rejects cycles, foreign parents, and deleting units with children", async () => {
    const org = await seedOrg();
    const other = await createWorkspaceMember({ role: "owner" });
    const [foreign] = await db
      .insert(schema.orgUnitTable)
      .values({ workspaceId: other.workspace.id, name: "Elsewhere" })
      .returning();

    for (const parentId of [org.eng.id, org.backend.id]) {
      const response = await call(app, org.owner, `/org-unit/${org.eng.id}`, {
        method: "PUT",
        body: { parentId },
      });
      expect(response.status).toBe(400);
    }
    expect(
      (
        await call(app, org.owner, `/org-unit/${org.backend.id}`, {
          method: "PUT",
          body: { parentId: foreign.id },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call(app, org.owner, `/org-unit/${org.workspaceId}`, {
          method: "POST",
          body: { name: "Bad", parentId: foreign.id },
        })
      ).status,
    ).toBe(400);
    // A unit from another workspace looks missing.
    expect(
      (
        await call(app, org.owner, `/org-unit/${foreign.id}`, {
          method: "PUT",
          body: { name: "Mine now" },
        })
      ).status,
    ).toBe(404);

    expect(
      (
        await call(app, org.owner, `/org-unit/${org.eng.id}`, {
          method: "DELETE",
        })
      ).status,
    ).toBe(409);

    const moved = await json<{ parentId: string | null; position: number }>(
      await call(app, org.owner, `/org-unit/${org.backend.id}`, {
        method: "PUT",
        body: { parentId: null, position: 5 },
      }),
    );
    expect(moved).toMatchObject({ parentId: null, position: 5 });
    expect(
      await json(
        await call(app, org.owner, `/org-unit/${org.eng.id}`, {
          method: "DELETE",
        }),
      ),
    ).toEqual({ id: org.eng.id });
    const memberships = await db
      .select()
      .from(schema.orgUnitMemberTable)
      .where(eq(schema.orgUnitMemberTable.orgUnitId, org.eng.id));
    expect(memberships).toEqual([]);
  });

  it("only accepts workspace members once each", async () => {
    const org = await seedOrg();
    const outsider = await createWorkspaceMember();
    const path = `/org-unit/${org.backend.id}/members`;

    expect(
      (
        await call(app, org.owner, path, {
          method: "PUT",
          body: { members: [{ userId: outsider.user.id, isLeader: false }] },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call(app, org.owner, path, {
          method: "PUT",
          body: {
            members: [
              { userId: org.staff.id, isLeader: false },
              { userId: org.staff.id, isLeader: true },
            ],
          },
        })
      ).status,
    ).toBe(400);

    const cleared = await json<{ members: unknown[] }>(
      await call(app, org.owner, path, {
        method: "PUT",
        body: { members: [] },
      }),
    );
    expect(cleared.members).toEqual([]);
  });

  it("deletes a workspace with a nested org tree", async () => {
    const org = await seedOrg();
    await deleteWorkspaceData(org.workspaceId);
    expect(await db.select().from(schema.orgUnitTable)).toEqual([]);
  });

  it("reports the caller's scope and recursive subordinates", async () => {
    const org = await seedOrg();
    const scope = (user: User) =>
      call(app, user, `/org-unit/${org.workspaceId}/my-scope`);

    expect(await json(await scope(org.leader))).toEqual({
      isWorkspaceAdmin: false,
      isInstanceAdmin: false,
      leadUnitIds: [org.eng.id],
      subordinateUserIds: [org.manager.id, org.staff.id].sort(),
    });
    expect(await json(await scope(org.manager))).toMatchObject({
      leadUnitIds: [org.backend.id],
      subordinateUserIds: [org.staff.id],
    });
    expect(await json(await scope(org.staff))).toMatchObject({
      leadUnitIds: [],
      subordinateUserIds: [],
    });
    expect(await json(await scope(org.owner))).toMatchObject({
      isWorkspaceAdmin: true,
      leadUnitIds: [],
    });
  });

  it("lets instance admins manage and view workspaces they are not in", async () => {
    const org = await seedOrg();
    const [admin] = await db
      .insert(schema.userTable)
      .values({
        id: `user-${randomUUID()}`,
        email: `admin-${randomUUID()}@example.com`,
        emailVerified: true,
        name: "Ada Admin",
        role: "admin",
      })
      .returning();

    expect(
      await json(
        await call(app, admin, `/org-unit/${org.workspaceId}/my-scope`),
      ),
    ).toMatchObject({ isWorkspaceAdmin: false, isInstanceAdmin: true });
    await json(
      await call(app, admin, `/org-unit/${org.eng.id}`, {
        method: "PUT",
        body: { name: "Engineering" },
      }),
    );
    const board = await json<{ people: unknown[] }>(
      await call(app, admin, `/leader-board/${org.workspaceId}?scope=all`),
    );
    expect(board.people).toHaveLength(5);

    // Outsiders can't learn the workspace or its units exist.
    const outsider = await createWorkspaceMember();
    expect(
      (await call(app, outsider.user, `/org-unit/${org.workspaceId}`)).status,
    ).toBe(404);
    expect(
      (
        await call(app, outsider.user, `/org-unit/${org.eng.id}`, {
          method: "DELETE",
        })
      ).status,
    ).toBe(404);
  });
});

describe("getSubordinateUserIds", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("walks every led unit, skips the leader, and ignores former members", async () => {
    const org = await seedOrg();
    // Lena also leads a second root; Sam co-leads Backend with Mia.
    const ops = await insertUnit(org.workspaceId, "Ops", null, [
      { user: org.leader, isLeader: true },
      { user: org.peer },
    ]);
    await db
      .update(schema.orgUnitMemberTable)
      .set({ isLeader: true })
      .where(eq(schema.orgUnitMemberTable.userId, org.staff.id));
    const leaver = await addPerson(org.workspaceId, "Lee Leaver");
    await insertUnit(org.workspaceId, "Infra", org.backend.id, [
      { user: leaver },
      { user: org.leader },
    ]);
    await db
      .delete(schema.workspaceUserTable)
      .where(eq(schema.workspaceUserTable.userId, leaver.id));

    expect(await getSubordinateUserIds(org.workspaceId, org.leader.id)).toEqual(
      [org.manager.id, org.staff.id, org.peer.id].sort(),
    );
    expect(await getSubordinateUserIds(org.workspaceId, org.staff.id)).toEqual(
      [org.manager.id, org.leader.id].sort(),
    );
    expect(await getSubordinateUserIds(org.workspaceId, org.peer.id)).toEqual(
      [],
    );
    expect(ops.id).toBeTruthy();
  });

  it("stays within the workspace", async () => {
    const org = await seedOrg();
    const other = await createWorkspaceMember();
    expect(
      await getSubordinateUserIds(other.workspace.id, org.leader.id),
    ).toEqual([]);
  });
});

type BoardPerson = {
  userId: string;
  userName: string;
  unitNames: string[];
  counts: { doing: number; overdue: number; stuck: number; total: number };
  cards: {
    taskId: string;
    ticket: string;
    projectName: string;
    statusName: string;
    myRoles: { roleId: string; roleName: string; progress: Progress }[];
    stuck: boolean;
    stuckReason: string | null;
    stuckDays: number | null;
  }[];
};
type Board = { people: BoardPerson[]; stuckThresholdDays: number };

async function seedBoard() {
  const org = await seedOrg();
  const { roles } = org;
  const secretStaffTask = await addTask(org.secret, {
    title: "Staff in secret project",
    column: "inProgress",
    members: [
      {
        user: org.staff,
        roleId: roles.dev,
        progress: "doing",
        updatedAt: daysAgo(10),
      },
    ],
  });
  const overdueTask = await addTask(org.open, {
    title: "Overdue",
    dueDate: new Date(Date.now() - 3 * DAY),
    members: [
      {
        user: org.manager,
        roleId: roles.product,
        progress: "done",
        updatedAt: daysAgo(4),
      },
      {
        user: org.staff,
        roleId: roles.dev,
        progress: "todo",
        updatedAt: daysAgo(2),
      },
    ],
  });
  const lastRoleTask = await addTask(org.open, {
    title: "Waiting on QA",
    priority: "urgent",
    members: [
      { user: org.manager, roleId: roles.product, progress: "done" },
      {
        user: org.manager,
        roleId: roles.qa,
        progress: "todo",
        updatedAt: daysAgo(1),
      },
      { user: org.staff, roleId: roles.dev, progress: "done" },
    ],
  });
  const legacyTask = await addTask(org.open, {
    title: "Assignee only",
    assigneeId: org.staff.id,
    priority: "low",
  });
  const leaderTask = await addTask(org.open, {
    title: "Leader's own",
    members: [{ user: org.leader, roleId: roles.owner, progress: "doing" }],
  });
  const leaderSecretTask = await addTask(org.secret, {
    title: "Leader in secret project",
    members: [{ user: org.leader, roleId: roles.dev, progress: "doing" }],
  });
  const peerSecretTask = await addTask(org.secret, {
    title: "Peer in secret project",
    members: [{ user: org.peer, roleId: roles.dev, progress: "doing" }],
  });
  const doneTask = await addTask(org.open, {
    title: "Done",
    column: "done",
    members: [{ user: org.staff, roleId: roles.dev, progress: "done" }],
  });
  const archivedTask = await addTask(org.open, {
    title: "Archived",
    status: "archived",
    members: [{ user: org.staff, roleId: roles.dev, progress: "doing" }],
  });
  return {
    ...org,
    tasks: {
      secretStaffTask,
      overdueTask,
      lastRoleTask,
      legacyTask,
      leaderTask,
      leaderSecretTask,
      peerSecretTask,
      doneTask,
      archivedTask,
    },
  };
}

const person = (board: Board, userId: string) => {
  const found = board.people.find((entry) => entry.userId === userId);
  if (!found) throw new Error(`no column for ${userId}`);
  return found;
};
const cardIds = (entry: BoardPerson) =>
  entry.cards.map((card) => card.taskId).sort();

describe("API integration: leader board", () => {
  let app: App;

  beforeEach(async () => {
    await resetTestDatabase();
    app = createApp().app;
  });

  it("shows a leader every subordinate's open work, even in projects they can't open", async () => {
    const org = await seedBoard();
    const { tasks } = org;
    const board = await json<Board>(
      await call(app, org.leader, `/leader-board/${org.workspaceId}`),
    );

    expect(board.stuckThresholdDays).toBe(7);
    expect(board.people.map((entry) => entry.userId).sort()).toEqual(
      [org.leader.id, org.manager.id, org.staff.id].sort(),
    );

    // Lena's own task in Secret stays hidden: her project access still applies.
    expect(cardIds(person(board, org.leader.id))).toEqual([
      tasks.leaderTask.id,
    ]);

    const staff = person(board, org.staff.id);
    expect(staff.unitNames).toEqual(["Backend"]);
    expect(cardIds(staff)).toEqual(
      [
        tasks.secretStaffTask.id,
        tasks.overdueTask.id,
        tasks.lastRoleTask.id,
        tasks.legacyTask.id,
      ].sort(),
    );
    expect(staff.counts).toEqual({ doing: 2, overdue: 1, stuck: 2, total: 4 });
    // Stuck first, then overdue, then priority.
    expect(staff.cards[0]?.taskId).toBe(tasks.overdueTask.id);
    expect(staff.cards[1]?.taskId).toBe(tasks.secretStaffTask.id);

    const byId = new Map(staff.cards.map((card) => [card.taskId, card]));
    expect(byId.get(tasks.overdueTask.id)).toMatchObject({
      ticket: `open-${tasks.overdueTask.number}`,
      stuck: true,
      stuckReason: "overdue",
      stuckDays: 2,
      myRoles: [{ roleId: org.roles.dev, roleName: "开发", progress: "todo" }],
    });
    expect(byId.get(tasks.secretStaffTask.id)).toMatchObject({
      projectName: "Secret",
      statusName: "In Progress",
      stuckReason: "idle",
      stuckDays: 10,
    });
    expect(byId.get(tasks.lastRoleTask.id)).toMatchObject({
      stuck: false,
      stuckReason: null,
    });
    // A bare assignee shows up as the primary owner.
    expect(byId.get(tasks.legacyTask.id)?.myRoles).toEqual([
      { roleId: org.roles.owner, roleName: "主要负责人", progress: "doing" },
    ]);

    const manager = person(board, org.manager.id);
    const lastRole = manager.cards.find(
      (card) => card.taskId === tasks.lastRoleTask.id,
    );
    expect(lastRole).toMatchObject({
      stuckReason: "last_role",
      stuckDays: 1,
      myRoles: [
        { roleId: org.roles.product, progress: "done" },
        { roleId: org.roles.qa, progress: "todo" },
      ],
    });
  });

  it("keeps subordinates from seeing their leader and limits wider scopes", async () => {
    const org = await seedBoard();
    const board = (user: User, query = "") =>
      call(app, user, `/leader-board/${org.workspaceId}${query}`);

    const staffBoard = await json<Board>(await board(org.staff));
    expect(staffBoard.people.map((entry) => entry.userId)).toEqual([
      org.staff.id,
    ]);
    // Without a leader's view the normal project access rules apply.
    await restrictToProjects(org.workspaceId, org.staff.id, [
      org.open.project.id,
    ]);
    const restricted = await json<Board>(await board(org.staff));
    expect(cardIds(person(restricted, org.staff.id))).not.toContain(
      org.tasks.secretStaffTask.id,
    );

    expect((await board(org.leader, "?scope=all")).status).toBe(403);
    expect(
      (await board(org.staff, `?scope=unit&unitId=${org.backend.id}`)).status,
    ).toBe(403);
    expect(
      (await board(org.manager, `?scope=unit&unitId=${org.eng.id}`)).status,
    ).toBe(403);
    expect((await board(org.owner, "?scope=unit")).status).toBe(400);
    expect((await board(org.owner, "?scope=unit&unitId=missing")).status).toBe(
      404,
    );
    expect((await board(org.owner, "?scope=everyone")).status).toBe(400);

    const unit = await json<Board>(
      await board(org.leader, `?scope=unit&unitId=${org.backend.id}`),
    );
    expect(unit.people.map((entry) => entry.userId).sort()).toEqual(
      [org.manager.id, org.staff.id].sort(),
    );

    const all = await json<Board>(await board(org.owner, "?scope=all"));
    expect(all.people).toHaveLength(5);
    expect(cardIds(person(all, org.peer.id))).toEqual([
      org.tasks.peerSecretTask.id,
    ]);
  });

  it("filters by project, role, progress, priority, and overdue", async () => {
    const org = await seedBoard();
    const staffCards = async (query: string) =>
      cardIds(
        person(
          await json<Board>(
            await call(
              app,
              org.leader,
              `/leader-board/${org.workspaceId}?${query}`,
            ),
          ),
          org.staff.id,
        ),
      );

    expect(await staffCards(`projectIds=${org.secret.project.id}`)).toEqual([
      org.tasks.secretStaffTask.id,
    ]);
    expect(await staffCards(`roleIds=${org.roles.owner}`)).toEqual([
      org.tasks.legacyTask.id,
    ]);
    expect(await staffCards("progress=todo")).toEqual([
      org.tasks.overdueTask.id,
    ]);
    expect(await staffCards("priority=urgent,low")).toEqual(
      [org.tasks.lastRoleTask.id, org.tasks.legacyTask.id].sort(),
    );
    expect(await staffCards("overdue=true")).toEqual([
      org.tasks.overdueTask.id,
    ]);
    // Empty lists mean no filter.
    expect(await staffCards("projectIds=&roleIds=")).toHaveLength(4);
    expect(
      (
        await call(
          app,
          org.leader,
          `/leader-board/${org.workspaceId}?progress=stalled`,
        )
      ).status,
    ).toBe(400);
  });

  it("honors KANEO_STUCK_DAYS", async () => {
    const org = await seedBoard();
    vi.stubEnv("KANEO_STUCK_DAYS", "30");
    const board = await json<Board>(
      await call(app, org.leader, `/leader-board/${org.workspaceId}`),
    );
    vi.unstubAllEnvs();
    expect(board.stuckThresholdDays).toBe(30);
    const card = person(board, org.staff.id).cards.find(
      (entry) => entry.taskId === org.tasks.secretStaffTask.id,
    );
    expect(card?.stuck).toBe(false);
  });

  it("runs the same number of queries however many people are in scope", async () => {
    const org = await seedBoard();
    const pool = getDatabasePool();
    const countQueries = async (path: string) => {
      mockAuthenticatedSession(org.owner);
      const spy = vi.spyOn(pool, "query");
      const response = await app.request(`/api${path}`);
      const calls = spy.mock.calls.length;
      spy.mockRestore();
      expect(response.status).toBe(200);
      return calls;
    };
    const boardPath = `/leader-board/${org.workspaceId}?scope=all`;
    const dashboardPath = `/dashboard/${org.workspaceId}?scope=all`;
    const before = [
      await countQueries(boardPath),
      await countQueries(dashboardPath),
    ];
    expect(before.every((calls) => calls > 0)).toBe(true);

    for (const name of ["Extra One", "Extra Two", "Extra Three"]) {
      const extra = await addPerson(org.workspaceId, name);
      await addTask(org.open, {
        title: `${name}'s task`,
        members: [{ user: extra, roleId: org.roles.dev, progress: "doing" }],
      });
    }

    expect([
      await countQueries(boardPath),
      await countQueries(dashboardPath),
    ]).toEqual(before);
  });
});

type Dashboard = {
  totals: {
    tasks: number;
    overdue: number;
    readyForReview: number;
    stuck: number;
    byStatus: { status: string; statusName: string; count: number }[];
  };
  workload: {
    userId: string;
    userName: string;
    todo: number;
    doing: number;
    done: number;
  }[];
  byProject: {
    projectId: string;
    projectName: string;
    byStatus: { status: string; count: number }[];
  }[];
  roleCompletion: { roleId: string; total: number; done: number }[];
  stuckList: {
    taskId: string;
    stuckReason: string;
    stuckDays: number;
    blockedBy: { userId: string; userName: string; roleName: string }[];
  }[];
};

describe("API integration: dashboard", () => {
  let app: App;

  beforeEach(async () => {
    await resetTestDatabase();
    app = createApp().app;
  });

  it("counts each task and each person once across projects", async () => {
    const org = await seedBoard();
    const { tasks, roles } = org;
    const ready = await addTask(org.open, {
      title: "Everyone done, not closed",
      column: "inReview",
      members: [
        { user: org.staff, roleId: roles.dev, progress: "done" },
        { user: org.staff, roleId: roles.qa, progress: "done" },
      ],
    });

    const dashboard = await json<Dashboard>(
      await call(app, org.leader, `/dashboard/${org.workspaceId}`),
    );

    // Leader's own Open task, her subordinates' six tasks (Secret included);
    // not her own Secret task, Pat's, or the archived one.
    expect(dashboard.totals).toMatchObject({
      tasks: 7,
      overdue: 1,
      readyForReview: 1,
      stuck: 3,
    });
    expect(dashboard.totals.byStatus).toEqual([
      { status: "to-do", statusName: "To Do", count: 4 },
      { status: "in-progress", statusName: "In Progress", count: 1 },
      { status: "in-review", statusName: "In Review", count: 1 },
      { status: "done", statusName: "Done", count: 1 },
    ]);

    const workload = new Map(
      dashboard.workload.map(({ userId, ...counts }) => [userId, counts]),
    );
    // Sam holds dev + qa on the ready task: one done, not two.
    expect(workload.get(org.staff.id)).toEqual({
      userName: "Sam Staff",
      todo: 1,
      doing: 2,
      done: 3,
    });
    // Mia holds product (done) + qa (todo) on one task: one todo.
    expect(workload.get(org.manager.id)).toEqual({
      userName: "Mia Manager",
      todo: 1,
      doing: 0,
      done: 1,
    });
    expect(workload.get(org.leader.id)).toMatchObject({ doing: 1 });

    expect(
      dashboard.byProject.map((project) => [
        project.projectName,
        project.byStatus.reduce((sum, entry) => sum + entry.count, 0),
      ]),
    ).toEqual([
      ["Open", 6],
      ["Secret", 1],
    ]);

    const roleCompletion = new Map(
      dashboard.roleCompletion.map(({ roleId, ...counts }) => [roleId, counts]),
    );
    expect(roleCompletion.get(roles.dev)).toEqual({
      roleName: "开发",
      total: 5,
      done: 3,
    });
    expect(roleCompletion.get(roles.product)).toMatchObject({
      total: 2,
      done: 2,
    });
    expect(roleCompletion.get(roles.qa)).toMatchObject({ total: 2, done: 1 });
    expect(roleCompletion.get(roles.owner)).toMatchObject({
      total: 2,
      done: 0,
    });

    expect(dashboard.stuckList.map((entry) => entry.taskId)).toEqual([
      tasks.secretStaffTask.id,
      tasks.overdueTask.id,
      tasks.lastRoleTask.id,
    ]);
    expect(dashboard.stuckList[1]).toMatchObject({
      stuckReason: "overdue",
      stuckDays: 2,
      blockedBy: [
        { userId: org.staff.id, userName: "Sam Staff", roleName: "开发" },
      ],
    });
    expect(dashboard.stuckList[2]).toMatchObject({
      stuckReason: "last_role",
      blockedBy: [{ userId: org.manager.id, roleName: "测试" }],
    });
    expect(ready.id).toBeTruthy();
  });

  it("filters by project and creation date, and guards scopes", async () => {
    const org = await seedBoard();
    const path = `/dashboard/${org.workspaceId}`;
    await addTask(org.open, {
      title: "Old",
      createdAt: new Date("2020-01-15T10:00:00.000Z"),
      members: [{ user: org.staff, roleId: org.roles.dev, progress: "todo" }],
    });

    const secretOnly = await json<Dashboard>(
      await call(
        app,
        org.leader,
        `${path}?projectIds=${org.secret.project.id}`,
      ),
    );
    expect(secretOnly.totals.tasks).toBe(1);

    const january = await json<Dashboard>(
      await call(app, org.leader, `${path}?from=2020-01-01&to=2020-01-15`),
    );
    expect(january.totals.tasks).toBe(1);
    const before = await json<Dashboard>(
      await call(app, org.leader, `${path}?to=2020-01-14`),
    );
    expect(before.totals.tasks).toBe(0);
    expect((await call(app, org.leader, `${path}?from=yesterday`)).status).toBe(
      400,
    );

    expect((await call(app, org.staff, `${path}?scope=all`)).status).toBe(403);
    const all = await json<Dashboard>(
      await call(app, org.owner, `${path}?scope=all`),
    );
    // Every non-archived task in the workspace with a participant.
    expect(all.totals.tasks).toBe(9);
  });
});

describe("leaderEditGuard", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("allows leaders over their recursive subordinates only", async () => {
    const org = await seedBoard();
    const taskId = org.tasks.overdueTask.id;

    expect(
      await leaderEditGuard(org.leader.id, { taskId, userId: org.staff.id }),
    ).toBe(true);
    expect(
      await leaderEditGuard(org.manager.id, { taskId, userId: org.staff.id }),
    ).toBe(true);
    expect(
      await leaderEditGuard(org.staff.id, { taskId, userId: org.manager.id }),
    ).toBe(false);
    expect(
      await leaderEditGuard(org.leader.id, { taskId, userId: org.leader.id }),
    ).toBe(false);
    expect(
      await leaderEditGuard(org.leader.id, {
        taskId: "missing",
        userId: org.staff.id,
      }),
    ).toBe(false);

    const other = await createWorkspaceMember();
    const elsewhere = await createProjectFixture({
      workspaceId: other.workspace.id,
    });
    const foreignTask = await addTask(elsewhere, {
      title: "Other workspace",
      assigneeId: other.user.id,
    });
    expect(
      await leaderEditGuard(org.leader.id, {
        taskId: foreignTask.id,
        userId: org.staff.id,
      }),
    ).toBe(false);
  });
});
