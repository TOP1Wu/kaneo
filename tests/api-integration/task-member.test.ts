import { and, asc, eq, inArray } from "drizzle-orm";
import type { User } from "better-auth/types";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { seedDefaultTaskRoles } from "../../apps/api/src/task-role/default-roles";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";
import { addWorkspaceMember } from "./helpers/project-access/add-workspace-member";
import { restrictToProjects } from "./helpers/project-access/restrict-to-projects";

type Member = {
  id: string;
  userId: string;
  roleId: string;
  roleSlug: string;
  isOwnerRole: boolean;
  progress: "todo" | "doing" | "done";
  startedAt: string | null;
  doneAt: string | null;
  note: string | null;
  position: number;
  updatedBy: string | null;
};
type MembersView = {
  members: Member[];
  summary: Array<{ roleSlug: string; total: number; done: number }>;
  readyForReview: boolean;
};

async function call(
  user: User,
  path: string,
  init: { method?: string; body?: unknown } = {},
) {
  mockAuthenticatedSession(user);
  const { app } = createApp();
  return app.request(`/api${path}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json" },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
}

async function json<T>(response: Response, status = 200): Promise<T> {
  const text = await response.text();
  expect(response.status, text).toBe(status);
  return JSON.parse(text) as T;
}

/**
 * One workspace with the default roles, a task, and people at different
 * permission levels. `member` holds task:update by default, so peers who
 * should be denied are `viewer`s.
 */
async function seed() {
  const { user: owner, workspace } = await createWorkspaceMember({
    role: "owner",
    userName: "Owner",
  });
  await seedDefaultTaskRoles(db, workspace.id);
  const { project, columns } = await createProjectFixture({
    workspaceId: workspace.id,
  });
  const [task] = await db
    .insert(schema.taskTable)
    .values({
      projectId: project.id,
      title: "Collaborative task",
      columnId: columns.todo.id,
      status: columns.todo.slug,
      number: 1,
    })
    .returning();
  const roles = Object.fromEntries(
    (
      await db
        .select()
        .from(schema.taskRoleTable)
        .where(eq(schema.taskRoleTable.workspaceId, workspace.id))
    ).map((role) => [role.slug, role]),
  ) as Record<"owner" | "product" | "dev" | "qa", { id: string }>;

  const lead = await addWorkspaceMember(workspace.id, "viewer");
  const dev1 = await addWorkspaceMember(workspace.id, "viewer");
  const dev2 = await addWorkspaceMember(workspace.id, "viewer");
  const qa = await addWorkspaceMember(workspace.id, "viewer");
  const bystander = await addWorkspaceMember(workspace.id, "viewer");
  return {
    owner,
    workspace,
    project,
    columns,
    task,
    roles,
    lead,
    dev1,
    dev2,
    qa,
    bystander,
  };
}

async function addMembers(
  actor: User,
  taskId: string,
  roleId: string,
  userIds: string[],
) {
  return json<MembersView>(
    await call(actor, `/task-member/task/${taskId}`, {
      method: "POST",
      body: { roleId, userIds },
    }),
  );
}

function memberOf(view: MembersView, userId: string, roleId?: string) {
  const member = view.members.find(
    (m) => m.userId === userId && (!roleId || m.roleId === roleId),
  );
  if (!member) throw new Error(`no member row for ${userId}`);
  return member;
}

async function taskAssignee(taskId: string) {
  const [task] = await db
    .select({ userId: schema.taskTable.userId })
    .from(schema.taskTable)
    .where(eq(schema.taskTable.id, taskId));
  return task?.userId ?? null;
}

async function memberActivities(taskId: string) {
  return db
    .select()
    .from(schema.activityTable)
    .where(
      and(
        eq(schema.activityTable.taskId, taskId),
        inArray(schema.activityTable.type, [
          "member_added",
          "member_removed",
          "member_role_changed",
          "member_progress_changed",
          "task_ready_for_review",
        ]),
      ),
    )
    .orderBy(asc(schema.activityTable.createdAt), asc(schema.activityTable.id));
}

describe("API integration: task members", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("adds several people under several roles and summarizes them", async () => {
    const { owner, task, roles, lead, dev1, dev2, qa } = await seed();

    await addMembers(owner, task.id, roles.owner.id, [lead.id]);
    await addMembers(owner, task.id, roles.dev.id, [dev1.id, dev2.id]);
    // Already-present memberships are skipped, not duplicated.
    const view = await addMembers(owner, task.id, roles.dev.id, [
      dev1.id,
      qa.id,
    ]);
    await addMembers(owner, task.id, roles.qa.id, [qa.id]);

    const fetched = await json<MembersView>(
      await call(owner, `/task-member/task/${task.id}`),
    );
    expect(view.members).toHaveLength(4);
    expect(fetched.members).toHaveLength(5);
    expect(fetched.summary).toEqual([
      expect.objectContaining({ roleSlug: "owner", total: 1, done: 0 }),
      expect.objectContaining({ roleSlug: "dev", total: 3, done: 0 }),
      expect.objectContaining({ roleSlug: "qa", total: 1, done: 0 }),
    ]);
    expect(fetched.readyForReview).toBe(false);
    expect(memberOf(fetched, lead.id)).toMatchObject({
      roleSlug: "owner",
      isOwnerRole: true,
      progress: "todo",
      userName: "Member viewer",
      updatedBy: owner.id,
    });

    const added = await memberActivities(task.id);
    expect(added.filter((a) => a.type === "member_added")).toHaveLength(5);
    expect(
      added.find(
        (a) =>
          a.type === "member_added" &&
          (a.eventData as { memberUserId: string }).memberUserId === qa.id &&
          (a.eventData as { roleId: string }).roleId === roles.qa.id,
      ),
    ).toMatchObject({
      userId: owner.id,
      eventData: { memberUserId: qa.id, roleName: "测试" },
    });
  });

  it("marks the task ready for review once everyone is done, and clears doneAt on withdrawal", async () => {
    const { owner, task, roles, dev1, qa } = await seed();
    const view = await addMembers(owner, task.id, roles.dev.id, [dev1.id]);
    await addMembers(owner, task.id, roles.qa.id, [qa.id]);
    const devRow = memberOf(view, dev1.id);
    const qaRow = memberOf(
      await json<MembersView>(
        await call(owner, `/task-member/task/${task.id}`),
      ),
      qa.id,
    );

    const doing = await json<MembersView>(
      await call(dev1, `/task-member/${devRow.id}`, {
        method: "PATCH",
        body: { progress: "doing" },
      }),
    );
    expect(memberOf(doing, dev1.id).startedAt).not.toBeNull();
    expect(memberOf(doing, dev1.id).doneAt).toBeNull();

    await call(dev1, `/task-member/${devRow.id}`, {
      method: "PATCH",
      body: { progress: "done", note: "merged" },
    });
    const allDone = await json<MembersView>(
      await call(qa, `/task-member/${qaRow.id}`, {
        method: "PATCH",
        body: { progress: "done" },
      }),
    );
    expect(allDone.readyForReview).toBe(true);
    expect(memberOf(allDone, dev1.id)).toMatchObject({ note: "merged" });
    expect(memberOf(allDone, qa.id).doneAt).not.toBeNull();

    // A no-op update to an already-done member doesn't log readiness again.
    await call(qa, `/task-member/${qaRow.id}`, {
      method: "PATCH",
      body: { progress: "done" },
    });
    expect(
      (await memberActivities(task.id)).filter(
        (a) => a.type === "task_ready_for_review",
      ),
    ).toHaveLength(1);

    const withdrawn = await json<MembersView>(
      await call(qa, `/task-member/${qaRow.id}`, {
        method: "PATCH",
        body: { progress: "doing" },
      }),
    );
    expect(withdrawn.readyForReview).toBe(false);
    expect(memberOf(withdrawn, qa.id).doneAt).toBeNull();
    expect(memberOf(withdrawn, qa.id).startedAt).not.toBeNull();

    const progress = (await memberActivities(task.id)).filter(
      (a) => a.type === "member_progress_changed",
    );
    expect(progress.map((a) => a.eventData)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberUserId: qa.id,
          from: "done",
          to: "doing",
          onBehalfOf: false,
        }),
      ]),
    );
  });

  it("lets members edit themselves, the primary owner edit on their behalf, and rejects bystanders", async () => {
    const { owner, task, roles, lead, dev1, dev2, bystander } = await seed();
    await addMembers(owner, task.id, roles.owner.id, [lead.id]);
    const view = await addMembers(owner, task.id, roles.dev.id, [
      dev1.id,
      dev2.id,
    ]);
    const devRow = memberOf(view, dev1.id);

    // A plain viewer can't edit someone else's row, or manage members.
    const denied = await call(bystander, `/task-member/${devRow.id}`, {
      method: "PATCH",
      body: { progress: "done" },
    });
    expect(denied.status).toBe(403);
    const peer = await call(dev2, `/task-member/${devRow.id}`, {
      method: "PATCH",
      body: { progress: "done" },
    });
    expect(peer.status).toBe(403);
    const addByViewer = await call(dev1, `/task-member/task/${task.id}`, {
      method: "POST",
      body: { roleId: roles.qa.id, userIds: [bystander.id] },
    });
    expect(addByViewer.status).toBe(403);
    // Members can't reshuffle roles on their own row either.
    const selfRole = await call(dev1, `/task-member/${devRow.id}`, {
      method: "PATCH",
      body: { roleId: roles.qa.id },
    });
    expect(selfRole.status).toBe(403);

    // The primary owner can, and the log marks it as on behalf of the member.
    const onBehalf = await json<MembersView>(
      await call(lead, `/task-member/${devRow.id}`, {
        method: "PATCH",
        body: { progress: "done" },
      }),
    );
    expect(memberOf(onBehalf, dev1.id)).toMatchObject({
      progress: "done",
      updatedBy: lead.id,
    });
    const [logged] = (await memberActivities(task.id)).filter(
      (a) => a.type === "member_progress_changed",
    );
    expect(logged).toMatchObject({
      userId: lead.id,
      eventData: {
        memberUserId: dev1.id,
        from: "todo",
        to: "done",
        onBehalfOf: true,
        roleName: "开发",
      },
    });

    // The primary owner also manages members despite only being a viewer.
    await addMembers(lead, task.id, roles.qa.id, [bystander.id]);
    const roleChanged = await json<MembersView>(
      await call(lead, `/task-member/${memberOf(onBehalf, dev2.id).id}`, {
        method: "PATCH",
        body: { roleId: roles.qa.id },
      }),
    );
    expect(memberOf(roleChanged, dev2.id).roleSlug).toBe("qa");
    expect(
      (await memberActivities(task.id)).find(
        (a) => a.type === "member_role_changed",
      ),
    ).toMatchObject({
      userId: lead.id,
      eventData: { memberUserId: dev2.id, from: "开发", to: "测试" },
    });
  });

  it("hands a seat to someone else, starting their progress over and logging both ends", async () => {
    const { owner, workspace, task, roles, lead, dev1, dev2, qa } =
      await seed();
    await addMembers(owner, task.id, roles.owner.id, [lead.id]);
    const view = await addMembers(owner, task.id, roles.dev.id, [dev1.id]);
    const seat = memberOf(view, dev1.id);

    // dev1 works on the seat and leaves a note on it.
    await call(dev1, `/task-member/${seat.id}`, {
      method: "PATCH",
      body: { progress: "done", note: "看过了" },
    });

    // A peer viewer can't take a seat; that is member management.
    const denied = await call(dev2, `/task-member/${seat.id}`, {
      method: "PATCH",
      body: { userId: qa.id },
    });
    expect(denied.status).toBe(403);

    // The primary owner hands the seat to dev2: same row, same place, fresh progress.
    const reassigned = await json<MembersView>(
      await call(lead, `/task-member/${seat.id}`, {
        method: "PATCH",
        body: { userId: dev2.id },
      }),
    );
    expect(memberOf(reassigned, dev2.id, roles.dev.id)).toMatchObject({
      id: seat.id,
      roleSlug: "dev",
      position: seat.position,
      progress: "todo",
      startedAt: null,
      doneAt: null,
      note: null,
      updatedBy: lead.id,
    });
    expect(reassigned.members.some((m) => m.userId === dev1.id)).toBe(false);
    // Activities in one transaction share a timestamp, so match on the person.
    const log = await memberActivities(task.id);
    const forPerson = (type: string, userId: string) =>
      log.find(
        (a) =>
          a.type === type &&
          (a.eventData as { memberUserId?: string } | null)?.memberUserId ===
            userId,
      );
    expect(forPerson("member_removed", dev1.id)).toMatchObject({
      userId: lead.id,
      eventData: { memberUserId: dev1.id, roleName: "开发" },
    });
    expect(forPerson("member_added", dev2.id)).toMatchObject({
      userId: lead.id,
      eventData: { memberUserId: dev2.id, roleName: "开发" },
    });

    // The same person can't hold one role twice on the same task.
    await addMembers(owner, task.id, roles.dev.id, [qa.id]);
    const duplicate = await call(
      owner,
      `/task-member/${memberOf(reassigned, dev2.id, roles.dev.id).id}`,
      { method: "PATCH", body: { userId: qa.id } },
    );
    expect(duplicate.status).toBe(409);

    // Someone who can't see the project can't take the seat either.
    const other = await createProjectFixture({ workspaceId: workspace.id });
    const restricted = await addWorkspaceMember(workspace.id, "member");
    await restrictToProjects(workspace.id, restricted.id, [other.project.id]);
    const hidden = await call(owner, `/task-member/${seat.id}`, {
      method: "PATCH",
      body: { userId: restricted.id },
    });
    expect(hidden.status).toBe(403);

    // Swapping the primary-owner seat moves the mirrored assignee with it.
    const ownerSeat = memberOf(reassigned, lead.id, roles.owner.id);
    await call(owner, `/task-member/${ownerSeat.id}`, {
      method: "PATCH",
      body: { userId: dev1.id },
    });
    expect(await taskAssignee(task.id)).toBe(dev1.id);
  });

  it("mirrors the first primary owner into the assignee and hands it on when they leave", async () => {
    const { owner, task, roles, lead, dev1, dev2, qa } = await seed();

    const first = await addMembers(owner, task.id, roles.owner.id, [lead.id]);
    expect(await taskAssignee(task.id)).toBe(lead.id);
    await addMembers(owner, task.id, roles.owner.id, [dev1.id]);
    // A second primary owner queues behind the first.
    expect(await taskAssignee(task.id)).toBe(lead.id);
    // Non-owner roles never touch the assignee.
    await addMembers(owner, task.id, roles.qa.id, [qa.id]);
    expect(await taskAssignee(task.id)).toBe(lead.id);

    const removed = await call(
      owner,
      `/task-member/${memberOf(first, lead.id).id}`,
      {
        method: "DELETE",
      },
    );
    expect(await json(removed)).toEqual({
      id: memberOf(first, lead.id).id,
      taskId: task.id,
    });
    expect(await taskAssignee(task.id)).toBe(dev1.id);

    const view = await json<MembersView>(
      await call(owner, `/task-member/task/${task.id}`),
    );
    await call(
      owner,
      `/task-member/${memberOf(view, dev1.id, roles.owner.id).id}`,
      {
        method: "DELETE",
      },
    );
    expect(await taskAssignee(task.id)).toBeNull();

    // Reverse: the classic assignee endpoint puts the person first in the owner role.
    const assign = (userId: string | null) =>
      call(owner, `/task/assignee/${task.id}`, {
        method: "PUT",
        body: { userId },
      });
    expect((await assign(dev2.id)).status).toBe(200);
    expect(await taskAssignee(task.id)).toBe(dev2.id);
    await addMembers(owner, task.id, roles.owner.id, [lead.id]);
    expect((await assign(lead.id)).status).toBe(200);
    const owners = (
      await json<MembersView>(await call(owner, `/task-member/task/${task.id}`))
    ).members.filter((m) => m.isOwnerRole);
    expect(owners.map((m) => [m.userId, m.position])).toEqual([
      [lead.id, 0],
      [dev2.id, 1],
    ]);
    expect(await taskAssignee(task.id)).toBe(lead.id);

    // Unassigning keeps the members.
    expect((await assign(null)).status).toBe(200);
    expect(await taskAssignee(task.id)).toBeNull();
    const kept = await json<MembersView>(
      await call(owner, `/task-member/task/${task.id}`),
    );
    expect(kept.members.filter((m) => m.isOwnerRole)).toHaveLength(2);
  });

  it("logs readiness when removing the last unfinished member", async () => {
    const { owner, task, roles, dev1, qa } = await seed();
    const view = await addMembers(owner, task.id, roles.dev.id, [dev1.id]);
    await addMembers(owner, task.id, roles.qa.id, [qa.id]);
    await call(dev1, `/task-member/${memberOf(view, dev1.id).id}`, {
      method: "PATCH",
      body: { progress: "done" },
    });
    const all = await json<MembersView>(
      await call(owner, `/task-member/task/${task.id}`),
    );
    await call(owner, `/task-member/${memberOf(all, qa.id).id}`, {
      method: "DELETE",
    });

    // Both rows share one transaction timestamp, so compare them as a set.
    const types = (await memberActivities(task.id)).map((a) => a.type);
    expect(types.filter((t) => t === "member_removed")).toHaveLength(1);
    expect(types.filter((t) => t === "task_ready_for_review")).toHaveLength(1);
  });

  it("lists tasks where I'm only a member in my tasks, with my roles", async () => {
    const { owner, workspace, columns, task, roles, lead, dev1 } = await seed();
    await addMembers(owner, task.id, roles.owner.id, [lead.id]);
    const dev = await addMembers(owner, task.id, roles.dev.id, [dev1.id]);
    const qa = await addMembers(owner, task.id, roles.qa.id, [dev1.id]);
    type Assigned = {
      tasks: Array<{
        id: string;
        title: string;
        myRoles: Array<{ roleName: string; progress: string }>;
      }>;
      total: number;
    };
    const mine = (user: User) =>
      call(user, `/task/assigned?workspaceId=${workspace.id}`).then((r) =>
        json<Assigned>(r),
      );

    const before = await mine(dev1);
    expect(before.total).toBe(1);
    expect(before.tasks[0]).toMatchObject({
      id: task.id,
      title: "Collaborative task",
      myRoles: [
        { roleName: "开发", progress: "todo" },
        { roleName: "测试", progress: "todo" },
      ],
    });

    // Once every one of my rows is done, it leaves my list (I'm not the assignee).
    await call(
      dev1,
      `/task-member/${memberOf(dev, dev1.id, roles.dev.id).id}`,
      {
        method: "PATCH",
        body: { progress: "done" },
      },
    );
    expect((await mine(dev1)).total).toBe(1);
    await call(dev1, `/task-member/${memberOf(qa, dev1.id, roles.qa.id).id}`, {
      method: "PATCH",
      body: { progress: "done" },
    });
    expect(await mine(dev1)).toEqual({ tasks: [], total: 0 });

    // The assignee keeps it until the task itself is completed.
    const leadRow = memberOf(dev, lead.id);
    await call(lead, `/task-member/${leadRow.id}`, {
      method: "PATCH",
      body: { progress: "done" },
    });
    expect((await mine(lead)).tasks[0]?.myRoles).toEqual([
      {
        memberId: leadRow.id,
        roleId: leadRow.roleId,
        roleName: "主要负责人",
        progress: "done",
      },
    ]);
    await db
      .update(schema.taskTable)
      .set({ columnId: columns.done.id, status: columns.done.slug })
      .where(eq(schema.taskTable.id, task.id));
    expect((await mine(lead)).total).toBe(0);
  });

  it("hides members from other workspaces and from users without project access", async () => {
    const { owner, workspace, project, task, roles, dev1 } = await seed();
    const view = await addMembers(owner, task.id, roles.dev.id, [dev1.id]);
    const devRow = memberOf(view, dev1.id);

    const { user: outsider } = await createWorkspaceMember({ role: "owner" });
    const crossRead = await call(outsider, `/task-member/task/${task.id}`);
    expect([403, 404]).toContain(crossRead.status);
    const crossPatch = await call(outsider, `/task-member/${devRow.id}`, {
      method: "PATCH",
      body: { progress: "done" },
    });
    expect([403, 404]).toContain(crossPatch.status);
    const crossSummary = await call(
      outsider,
      `/task-member/summary?taskIds=${task.id}`,
    );
    expect([403, 404]).toContain(crossSummary.status);

    const other = await createProjectFixture({ workspaceId: workspace.id });
    const restricted = await addWorkspaceMember(workspace.id, "member");
    await restrictToProjects(workspace.id, restricted.id, [other.project.id]);
    expect(
      (await call(restricted, `/task-member/task/${task.id}`)).status,
    ).toBe(403);
    expect(
      (await call(restricted, `/task-member/summary?taskIds=${task.id}`))
        .status,
    ).toBe(403);

    // Someone who can't see the project can't be added as a member either.
    const addHidden = await call(owner, `/task-member/task/${task.id}`, {
      method: "POST",
      body: { roleId: roles.qa.id, userIds: [restricted.id] },
    });
    expect(addHidden.status).toBe(403);
    // Nor can a role from another workspace be used.
    const outsiderWorkspace = (
      await db
        .select({ workspaceId: schema.workspaceUserTable.workspaceId })
        .from(schema.workspaceUserTable)
        .where(eq(schema.workspaceUserTable.userId, outsider.id))
    )[0]?.workspaceId as string;
    await seedDefaultTaskRoles(db, outsiderWorkspace);
    const [foreignRole] = await db
      .select({ id: schema.taskRoleTable.id })
      .from(schema.taskRoleTable)
      .where(eq(schema.taskRoleTable.workspaceId, outsiderWorkspace))
      .limit(1);
    const foreign = await call(owner, `/task-member/task/${task.id}`, {
      method: "POST",
      body: { roleId: foreignRole?.id, userIds: [dev1.id] },
    });
    expect(foreign.status).toBe(404);
    expect(project.workspaceId).toBe(workspace.id);
  });

  it("summarizes many tasks in one call and rejects more than 200 ids", async () => {
    const { owner, project, columns, task, roles, dev1, qa } = await seed();
    const [empty] = await db
      .insert(schema.taskTable)
      .values({
        projectId: project.id,
        title: "Nobody here",
        columnId: columns.todo.id,
        status: columns.todo.slug,
        number: 2,
      })
      .returning();
    const view = await addMembers(owner, task.id, roles.dev.id, [dev1.id]);
    await addMembers(owner, task.id, roles.qa.id, [qa.id]);
    await call(dev1, `/task-member/${memberOf(view, dev1.id).id}`, {
      method: "PATCH",
      body: { progress: "done" },
    });

    const body = await json<{
      summaries: Array<{
        taskId: string;
        summary: unknown[];
        readyForReview: boolean;
      }>;
    }>(
      await call(owner, `/task-member/summary?taskIds=${task.id},${empty.id}`),
    );
    expect(body.summaries).toEqual([
      {
        taskId: task.id,
        summary: [
          expect.objectContaining({
            roleSlug: "dev",
            roleName: "开发",
            total: 1,
            done: 1,
          }),
          expect.objectContaining({
            roleSlug: "qa",
            roleName: "测试",
            total: 1,
            done: 0,
          }),
        ],
        readyForReview: false,
      },
      { taskId: empty.id, summary: [], readyForReview: false },
    ]);

    const tooMany = Array.from({ length: 201 }, (_, i) => `task-${i}`).join(
      ",",
    );
    const rejected = await call(
      owner,
      `/task-member/summary?taskIds=${tooMany}`,
    );
    expect(rejected.status).toBe(400);
    expect((await call(owner, "/task-member/summary?taskIds=")).status).toBe(
      400,
    );
  });

  it("manages task roles for admins and keeps the owner role active", async () => {
    const { owner, workspace, roles, dev1 } = await seed();
    const listed = await json<{
      roles: Array<{
        slug: string;
        isOwnerRole: boolean;
        archived: boolean;
        position: number;
      }>;
    }>(await call(dev1, `/task-role/${workspace.id}`));
    expect(
      listed.roles.map((r) => [r.slug, r.isOwnerRole, r.archived]),
    ).toEqual([
      ["owner", true, false],
      ["product", false, false],
      ["dev", false, false],
      ["qa", false, false],
    ]);

    const denied = await call(dev1, `/task-role/${workspace.id}`, {
      method: "POST",
      body: { name: "设计" },
    });
    expect(denied.status).toBe(403);

    const created = await json<{
      id: string;
      slug: string;
      position: number;
      color: string | null;
    }>(
      await call(owner, `/task-role/${workspace.id}`, {
        method: "POST",
        body: { name: "设计", color: "#FF6600" },
      }),
    );
    expect(created).toMatchObject({ position: 4, color: "#FF6600" });
    expect(created.slug).toMatch(/^role-/);

    const archived = await json<{ archived: boolean; name: string }>(
      await call(owner, `/task-role/${created.id}`, {
        method: "PUT",
        body: { archived: true, name: "UI 设计" },
      }),
    );
    expect(archived).toMatchObject({ archived: true, name: "UI 设计" });
    const restored = await json<{ archived: boolean }>(
      await call(owner, `/task-role/${created.id}`, {
        method: "PUT",
        body: { archived: false },
      }),
    );
    expect(restored.archived).toBe(false);

    const ownerArchive = await call(owner, `/task-role/${roles.owner.id}`, {
      method: "PUT",
      body: { archived: true },
    });
    expect(ownerArchive.status).toBe(400);
  });
});
