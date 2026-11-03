import { asc, eq, inArray } from "drizzle-orm";
import db from "../database";
import { taskMemberTable, taskRoleTable, userTable } from "../database/schema";
import type { DbOrTx } from "../project-access/db-or-tx";
import type { MemberProgress } from "./progress-timestamps";
import { summarizeMembers } from "./summarize-members";

const memberColumns = {
  id: taskMemberTable.id,
  taskId: taskMemberTable.taskId,
  userId: taskMemberTable.userId,
  userName: userTable.name,
  userImage: userTable.image,
  roleId: taskMemberTable.roleId,
  roleName: taskRoleTable.name,
  roleSlug: taskRoleTable.slug,
  rolePosition: taskRoleTable.position,
  isOwnerRole: taskRoleTable.isOwnerRole,
  progress: taskMemberTable.progress,
  startedAt: taskMemberTable.startedAt,
  doneAt: taskMemberTable.doneAt,
  note: taskMemberTable.note,
  position: taskMemberTable.position,
  updatedBy: taskMemberTable.updatedBy,
  createdAt: taskMemberTable.createdAt,
};

export type LoadedMember = Awaited<ReturnType<typeof loadMembers>>[number];

async function loadMembers(
  database: DbOrTx,
  where: ReturnType<typeof eq> | ReturnType<typeof inArray>,
) {
  const rows = await database
    .select(memberColumns)
    .from(taskMemberTable)
    .innerJoin(userTable, eq(taskMemberTable.userId, userTable.id))
    .innerJoin(taskRoleTable, eq(taskMemberTable.roleId, taskRoleTable.id))
    .where(where)
    .orderBy(
      asc(taskRoleTable.position),
      asc(taskMemberTable.position),
      asc(taskMemberTable.createdAt),
      asc(taskMemberTable.id),
    );
  return rows.map((row) => ({
    ...row,
    progress: row.progress as MemberProgress,
  }));
}

export function loadTaskMembers(taskId: string, database: DbOrTx = db) {
  return loadMembers(database, eq(taskMemberTable.taskId, taskId));
}

export async function loadTaskMember(memberId: string, database: DbOrTx = db) {
  const [member] = await loadMembers(
    database,
    eq(taskMemberTable.id, memberId),
  );
  return member ?? null;
}

export function toPublicMember({
  rolePosition: _rolePosition,
  createdAt: _createdAt,
  ...member
}: LoadedMember) {
  return member;
}

export async function taskMembersView(taskId: string, database: DbOrTx = db) {
  const members = await loadTaskMembers(taskId, database);
  return { members: members.map(toPublicMember), ...summarizeMembers(members) };
}
