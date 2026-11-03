import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import db from "../../database";
import {
  columnTable,
  projectTable,
  taskMemberTable,
  taskRoleTable,
  taskTable,
  userTable,
} from "../../database/schema";
import type { MemberState, Progress } from "../../leader-board/stuck";
import { projectAccessCondition } from "../../project-access/project-access-condition";
import { taskIsCompleted } from "../../task/task-is-completed";
import type { LoadedScope } from "./load-scope";

export type Participant = MemberState & {
  roleName: string | null;
  rolePosition: number;
  /** True for a bare assignee that has no task_member row yet. */
  synthesized: boolean;
};

export type ScopedTask = {
  id: string;
  ticket: string;
  title: string;
  projectId: string;
  projectName: string;
  priority: string;
  dueDate: Date | null;
  status: string;
  statusName: string;
  /** Position of the status column, for ordering; null for virtual statuses. */
  statusPosition: number | null;
  createdAt: Date;
  isCompleted: boolean;
  participants: Participant[];
};

export type ScopedUser = { name: string; image: string | null };

export type ScopedRole = {
  id: string;
  name: string;
  position: number;
  isOwnerRole: boolean;
  archived: boolean;
};

export type ScopedTasks = {
  tasks: ScopedTask[];
  users: Map<string, ScopedUser>;
  roles: ScopedRole[];
};

export type ScopedTaskFilters = {
  projectIds?: string[];
  includeCompleted: boolean;
  createdFrom?: Date;
  createdBefore?: Date;
};

const textArray = (values: readonly string[]) =>
  sql`${sql.param([...values])}::text[]`;

/** The assignee or any task member is one of `userIds`. */
function participates(userIds: readonly string[]) {
  return sql<boolean>`(
    ${taskTable.userId} = ANY(${textArray(userIds)})
    OR EXISTS (
      SELECT 1 FROM ${taskMemberTable}
      WHERE ${taskMemberTable.taskId} = ${taskTable.id}
        AND ${taskMemberTable.userId} = ANY(${textArray(userIds)})
    )
  )`;
}

const isCompleted = sql<boolean>`coalesce((
  select ${columnTable.isFinal} from ${columnTable}
  where ${columnTable.id} = ${taskTable.columnId}
    and ${columnTable.projectId} = ${taskTable.projectId}
), ${taskIsCompleted})`;

/**
 * Open (and optionally completed) tasks that anyone in the scope takes part
 * in. Project access applies as usual, except that tasks with a trusted
 * participant stay visible: leaders read their subordinates' work in every
 * project. The query count does not grow with the number of people.
 */
export async function loadScopedTasks(
  workspaceId: string,
  actorId: string,
  scope: LoadedScope,
  filters: ScopedTaskFilters,
): Promise<ScopedTasks> {
  const roles = await db
    .select({
      id: taskRoleTable.id,
      name: taskRoleTable.name,
      position: taskRoleTable.position,
      isOwnerRole: taskRoleTable.isOwnerRole,
      archivedAt: taskRoleTable.archivedAt,
    })
    .from(taskRoleTable)
    .where(eq(taskRoleTable.workspaceId, workspaceId))
    .orderBy(asc(taskRoleTable.position), asc(taskRoleTable.id));
  const scopedRoles = roles.map(({ archivedAt, ...role }) => ({
    ...role,
    archived: archivedAt !== null,
  }));

  if (scope.people.length === 0 || filters.projectIds?.length === 0) {
    return {
      tasks: [],
      users: await loadUsers(scope.people),
      roles: scopedRoles,
    };
  }

  const access = projectAccessCondition(actorId, projectTable.id);
  // Duplicate slugs can exist from concurrent column creation; keep one name.
  const statusColumn = db
    .select({ name: columnTable.name, position: columnTable.position })
    .from(columnTable)
    .where(
      and(
        eq(columnTable.projectId, taskTable.projectId),
        eq(columnTable.slug, taskTable.status),
      ),
    )
    .orderBy(
      sql`case when ${columnTable.id} = ${taskTable.columnId} then 0 else 1 end`,
      asc(columnTable.position),
      asc(columnTable.createdAt),
      asc(columnTable.id),
    )
    .limit(1)
    .as("scoped_status_column");

  const rows = await db
    .select({
      id: taskTable.id,
      number: taskTable.number,
      title: taskTable.title,
      projectId: taskTable.projectId,
      projectName: projectTable.name,
      projectSlug: projectTable.slug,
      priority: taskTable.priority,
      dueDate: taskTable.dueDate,
      status: taskTable.status,
      statusName: statusColumn.name,
      statusPosition: statusColumn.position,
      createdAt: taskTable.createdAt,
      updatedAt: taskTable.updatedAt,
      assigneeId: taskTable.userId,
      isCompleted,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .leftJoinLateral(statusColumn, sql`true`)
    .where(
      and(
        eq(projectTable.workspaceId, workspaceId),
        isNull(projectTable.archivedAt),
        ne(taskTable.status, "archived"),
        filters.projectIds
          ? inArray(taskTable.projectId, filters.projectIds)
          : undefined,
        filters.createdFrom
          ? gte(taskTable.createdAt, filters.createdFrom)
          : undefined,
        filters.createdBefore
          ? lt(taskTable.createdAt, filters.createdBefore)
          : undefined,
        filters.includeCompleted ? undefined : sql`not ${isCompleted}`,
        participates(scope.people),
        scope.trusted.length > 0
          ? or(access, participates(scope.trusted))
          : access,
      ),
    );

  const members = rows.length
    ? await db
        .select({
          taskId: taskMemberTable.taskId,
          userId: taskMemberTable.userId,
          roleId: taskMemberTable.roleId,
          progress: taskMemberTable.progress,
          updatedAt: taskMemberTable.updatedAt,
          roleName: taskRoleTable.name,
          rolePosition: taskRoleTable.position,
        })
        .from(taskMemberTable)
        .innerJoin(taskRoleTable, eq(taskRoleTable.id, taskMemberTable.roleId))
        .where(
          sql`${taskMemberTable.taskId} = ANY(${textArray(rows.map((row) => row.id))})`,
        )
        .orderBy(
          asc(taskRoleTable.position),
          asc(taskMemberTable.position),
          asc(taskMemberTable.createdAt),
        )
    : [];

  const membersByTask = new Map<string, Participant[]>();
  for (const { taskId, progress, ...member } of members) {
    const list = membersByTask.get(taskId) ?? [];
    list.push({
      ...member,
      progress: progress as Progress,
      synthesized: false,
    });
    membersByTask.set(taskId, list);
  }

  // The assignee mirrors the primary owner; legacy rows may lack a member row.
  const ownerRole =
    scopedRoles.find((role) => role.isOwnerRole && !role.archived) ??
    scopedRoles.find((role) => role.isOwnerRole);

  const tasks = rows.map((row): ScopedTask => {
    const participants = membersByTask.get(row.id) ?? [];
    if (
      row.assigneeId &&
      !participants.some((member) => member.userId === row.assigneeId)
    ) {
      participants.push({
        userId: row.assigneeId,
        roleId: ownerRole?.id ?? null,
        roleName: ownerRole?.name ?? null,
        rolePosition: ownerRole?.position ?? -1,
        progress: row.isCompleted ? "done" : "doing",
        updatedAt: row.updatedAt,
        synthesized: true,
      });
    }
    return {
      id: row.id,
      ticket: `${row.projectSlug}-${row.number}`,
      title: row.title,
      projectId: row.projectId,
      projectName: row.projectName,
      priority: row.priority,
      dueDate: row.dueDate,
      status: row.status,
      statusName: row.statusName ?? row.status,
      statusPosition: row.statusPosition ?? null,
      createdAt: row.createdAt,
      isCompleted: Boolean(row.isCompleted),
      participants,
    };
  });

  const userIds = new Set(scope.people);
  for (const task of tasks) {
    for (const participant of task.participants)
      userIds.add(participant.userId);
  }

  return {
    tasks,
    users: await loadUsers([...userIds]),
    roles: scopedRoles,
  };
}

async function loadUsers(userIds: readonly string[]) {
  if (userIds.length === 0) return new Map<string, ScopedUser>();
  const users = await db
    .select({ id: userTable.id, name: userTable.name, image: userTable.image })
    .from(userTable)
    .where(sql`${userTable.id} = ANY(${textArray(userIds)})`);
  return new Map(
    users.map((user) => [user.id, { name: user.name, image: user.image }]),
  );
}
