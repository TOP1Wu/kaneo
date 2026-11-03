import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import deleteAccountData from "../../apps/api/src/user/controllers/delete-account-data";
import { deleteWorkspaceData } from "../../apps/api/src/workspace/lifecycle/delete-workspace-data";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

// The hand-written data statements at the end of migration 0073: role seed
// and assignee backfill. Re-run them against fixtures to prove upgrade behavior.
function readMigrationDataStatements() {
  const drizzleDir = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../apps/api/drizzle",
  );
  const file = readdirSync(drizzleDir).find((name) => name.startsWith("0073_"));
  if (!file) throw new Error("migration 0073 not found");
  return readFileSync(resolve(drizzleDir, file), "utf8")
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.includes("Data (hand-written)"));
}

// Drizzle wraps driver errors; the Postgres SQLSTATE lives on `cause`.
async function pgErrorCode(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause;
    return cause?.code ?? (error as { code?: string }).code;
  }
  return undefined;
}

async function createWorkspaceThroughApi() {
  const { app } = createApp();
  const signUp = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: `owner-${randomUUID()}@example.com`,
      password: "correct horse battery staple",
      name: "Workspace Owner",
    }),
  });
  expect(signUp.status).toBe(200);
  const cookie = signUp.headers
    .getSetCookie()
    .map((entry) => entry.split(";")[0])
    .join("; ");

  const created = await app.request("/api/auth/organization/create", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      name: "Roles Space",
      slug: `roles-${randomUUID()}`,
    }),
  });
  expect(created.status).toBe(200);
  return (await created.json()) as { id: string };
}

async function seedTaskWithRole() {
  const { user, workspace } = await createWorkspaceMember({ role: "owner" });
  const { project, columns } = await createProjectFixture({
    workspaceId: workspace.id,
  });
  const [task] = await db
    .insert(schema.taskTable)
    .values({
      projectId: project.id,
      title: "Foundation task",
      columnId: columns.todo.id,
      status: columns.todo.slug,
    })
    .returning();
  const [role] = await db
    .insert(schema.taskRoleTable)
    .values({ workspaceId: workspace.id, name: "开发", slug: "dev" })
    .returning();
  return { user, workspace, task, role };
}

describe("API integration: task member foundation", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("seeds the four default task roles for a new workspace", async () => {
    const workspace = await createWorkspaceThroughApi();

    const roles = await db
      .select()
      .from(schema.taskRoleTable)
      .where(eq(schema.taskRoleTable.workspaceId, workspace.id))
      .orderBy(schema.taskRoleTable.position);

    expect(roles.map((role) => [role.slug, role.name, role.position])).toEqual([
      ["owner", "主要负责人", 0],
      ["product", "产品", 1],
      ["dev", "开发", 2],
      ["qa", "测试", 3],
    ]);
    expect(roles.filter((role) => role.isOwnerRole)).toHaveLength(1);
    expect(roles.find((role) => role.isOwnerRole)?.slug).toBe("owner");
  });

  it("rejects a duplicate (task, user, role) membership", async () => {
    const { user, task, role } = await seedTaskWithRole();
    const member = { taskId: task.id, userId: user.id, roleId: role.id };

    await db.insert(schema.taskMemberTable).values(member);

    expect(
      await pgErrorCode(db.insert(schema.taskMemberTable).values(member)),
    ).toBe("23505");
  });

  it("rejects an unknown progress value", async () => {
    const { user, task, role } = await seedTaskWithRole();

    expect(
      await pgErrorCode(
        db.insert(schema.taskMemberTable).values({
          taskId: task.id,
          userId: user.id,
          roleId: role.id,
          progress: "bad",
        }),
      ),
    ).toBe("23514");
  });

  it("removes memberships when their task is deleted", async () => {
    const { user, task, role } = await seedTaskWithRole();
    await db
      .insert(schema.taskMemberTable)
      .values({ taskId: task.id, userId: user.id, roleId: role.id });

    await db.delete(schema.taskTable).where(eq(schema.taskTable.id, task.id));

    const remaining = await db
      .select()
      .from(schema.taskMemberTable)
      .where(eq(schema.taskMemberTable.taskId, task.id));
    expect(remaining).toHaveLength(0);
  });

  it("refuses to delete an org unit that still has children", async () => {
    const { workspace } = await createWorkspaceMember();
    const [parent] = await db
      .insert(schema.orgUnitTable)
      .values({ workspaceId: workspace.id, name: "研发中心" })
      .returning();
    await db.insert(schema.orgUnitTable).values({
      workspaceId: workspace.id,
      parentId: parent.id,
      name: "前端组",
    });

    expect(
      await pgErrorCode(
        db
          .delete(schema.orgUnitTable)
          .where(eq(schema.orgUnitTable.id, parent.id)),
      ),
    ).toBe("23001"); // restrict_violation
  });

  it("still refuses to drop a role that members use", async () => {
    const { user, task, role } = await seedTaskWithRole();
    await db
      .insert(schema.taskMemberTable)
      .values({ taskId: task.id, userId: user.id, roleId: role.id });

    expect(
      await pgErrorCode(
        db
          .delete(schema.taskRoleTable)
          .where(eq(schema.taskRoleTable.id, role.id)),
      ),
    ).toBe("23001");
  });

  it("deletes a workspace whose tasks still have members", async () => {
    const { user, workspace, task, role } = await seedTaskWithRole();
    await db
      .insert(schema.taskMemberTable)
      .values({ taskId: task.id, userId: user.id, roleId: role.id });

    await deleteWorkspaceData(workspace.id);

    expect(await db.select().from(schema.workspaceTable)).toHaveLength(0);
    expect(await db.select().from(schema.taskMemberTable)).toHaveLength(0);
    expect(await db.select().from(schema.taskRoleTable)).toHaveLength(0);
  });

  it("deletes a sole owner's workspace with members when the account is removed", async () => {
    const { user, task, role } = await seedTaskWithRole();
    await db
      .insert(schema.taskMemberTable)
      .values({ taskId: task.id, userId: user.id, roleId: role.id });

    await deleteAccountData(user.id);

    expect(await db.select().from(schema.workspaceTable)).toHaveLength(0);
    expect(await db.select().from(schema.taskMemberTable)).toHaveLength(0);
  });

  it("seeds roles and backfills assignees when upgrading existing data", async () => {
    const { user, workspace } = await createWorkspaceMember();
    const { project, columns } = await createProjectFixture({
      workspaceId: workspace.id,
    });
    let nextNumber = 1;
    const insertTask = async (
      title: string,
      values: Partial<typeof schema.taskTable.$inferInsert>,
    ) => {
      const [task] = await db
        .insert(schema.taskTable)
        .values({
          projectId: project.id,
          number: nextNumber++,
          title,
          ...values,
        })
        .returning();
      return task;
    };
    const active = await insertTask("active", {
      userId: user.id,
      columnId: columns.inProgress.id,
      status: columns.inProgress.slug,
    });
    const finished = await insertTask("finished", {
      userId: user.id,
      columnId: columns.done.id,
      status: columns.done.slug,
    });
    const unassigned = await insertTask("unassigned", {
      columnId: columns.todo.id,
      status: columns.todo.slug,
    });
    const legacyDone = await insertTask("legacy done", {
      userId: user.id,
      status: "done",
    });

    const statements = readMigrationDataStatements();
    expect(statements).toHaveLength(2);
    // Twice: an interrupted or repeated upgrade must not duplicate rows.
    for (const statement of [...statements, ...statements]) {
      await db.execute(sql.raw(statement));
    }

    const roles = await db
      .select()
      .from(schema.taskRoleTable)
      .where(eq(schema.taskRoleTable.workspaceId, workspace.id));
    expect(roles.map((role) => role.slug).sort()).toEqual([
      "dev",
      "owner",
      "product",
      "qa",
    ]);
    const ownerRole = roles.find((role) => role.isOwnerRole);
    expect(roles.filter((role) => role.isOwnerRole)).toHaveLength(1);
    expect(ownerRole?.slug).toBe("owner");

    const members = await db.select().from(schema.taskMemberTable);
    const byTask = new Map(members.map((member) => [member.taskId, member]));
    expect(members).toHaveLength(3);
    expect(byTask.has(unassigned.id)).toBe(false);
    for (const member of members) {
      expect(member.userId).toBe(user.id);
      expect(member.roleId).toBe(ownerRole?.id);
    }

    expect(byTask.get(active.id)).toMatchObject({ progress: "doing" });
    expect(byTask.get(active.id)?.startedAt).toBeInstanceOf(Date);
    expect(byTask.get(active.id)?.doneAt).toBeNull();

    expect(byTask.get(finished.id)).toMatchObject({ progress: "done" });
    expect(byTask.get(finished.id)?.doneAt).toBeInstanceOf(Date);
    expect(byTask.get(finished.id)?.startedAt).toBeNull();

    expect(byTask.get(legacyDone.id)).toMatchObject({ progress: "done" });
  });
});
