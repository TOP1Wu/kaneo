import type {
  Participant,
  ScopedTask,
  ScopedUser,
} from "../org-unit/scope/load-scoped-tasks";
import {
  evaluateStuck,
  isPastDue,
  mostBehind,
  type Progress,
  type StuckReason,
} from "./stuck";

export const CARDS_PER_PERSON = 100;

export type BoardFilters = {
  roleIds?: string[];
  progress?: Progress[];
  priority?: string[];
  overdue?: boolean;
};

export type BoardCard = {
  taskId: string;
  ticket: string;
  title: string;
  projectId: string;
  projectName: string;
  priority: string;
  dueDate: Date | null;
  status: string;
  statusName: string;
  myRoles: { roleId: string; roleName: string; progress: Progress }[];
  stuck: boolean;
  stuckReason: StuckReason | null;
  stuckDays: number | null;
};

export type BoardPerson = {
  userId: string;
  userName: string;
  userImage: string | null;
  unitNames: string[];
  counts: { doing: number; overdue: number; stuck: number; total: number };
  cards: BoardCard[];
};

const PRIORITY_RANK: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

type Entry = {
  card: BoardCard;
  progress: Progress;
  overdue: boolean;
  createdAt: number;
};

function compareEntries(a: Entry, b: Entry) {
  return (
    Number(b.card.stuck) - Number(a.card.stuck) ||
    Number(b.overdue) - Number(a.overdue) ||
    (PRIORITY_RANK[b.card.priority] ?? 0) -
      (PRIORITY_RANK[a.card.priority] ?? 0) ||
    (a.card.dueDate?.getTime() ?? Number.POSITIVE_INFINITY) -
      (b.card.dueDate?.getTime() ?? Number.POSITIVE_INFINITY) ||
    a.createdAt - b.createdAt ||
    a.card.taskId.localeCompare(b.card.taskId)
  );
}

function matches(
  rows: Participant[],
  task: ScopedTask,
  filters: BoardFilters,
  overdue: boolean,
  progress: Progress,
) {
  if (
    filters.roleIds &&
    !rows.some((row) => row.roleId && filters.roleIds?.includes(row.roleId))
  ) {
    return false;
  }
  if (filters.progress && !filters.progress.includes(progress)) return false;
  if (filters.priority && !filters.priority.includes(task.priority))
    return false;
  if (filters.overdue !== undefined && filters.overdue !== overdue)
    return false;
  return true;
}

/**
 * One column per person in scope, with their open-task cards. Counts cover
 * every matching task; cards are capped at CARDS_PER_PERSON, stuck first.
 */
export function buildPeople({
  people,
  tasks,
  users,
  unitNames,
  filters,
  now,
  thresholdDays,
}: {
  people: readonly string[];
  tasks: readonly ScopedTask[];
  users: ReadonlyMap<string, ScopedUser>;
  unitNames: ReadonlyMap<string, string[]>;
  filters: BoardFilters;
  now: Date;
  thresholdDays: number;
}): BoardPerson[] {
  const inScope = new Set(people);
  const entries = new Map<string, Entry[]>(people.map((id) => [id, []]));

  for (const task of tasks) {
    if (task.isCompleted) continue;
    const verdicts = evaluateStuck(
      { dueDate: task.dueDate, members: task.participants },
      now,
      thresholdDays,
    );
    const pastDue = isPastDue(task.dueDate, now);

    const rowsByUser = new Map<string, Participant[]>();
    for (const row of task.participants) {
      if (!inScope.has(row.userId)) continue;
      const rows = rowsByUser.get(row.userId) ?? [];
      rows.push(row);
      rowsByUser.set(row.userId, rows);
    }

    for (const [userId, rows] of rowsByUser) {
      const progress = mostBehind(rows.map((row) => row.progress));
      const overdue = pastDue && progress !== "done";
      if (!matches(rows, task, filters, overdue, progress)) continue;
      const verdict = verdicts.get(userId);
      entries.get(userId)?.push({
        progress,
        overdue,
        createdAt: task.createdAt.getTime(),
        card: {
          taskId: task.id,
          ticket: task.ticket,
          title: task.title,
          projectId: task.projectId,
          projectName: task.projectName,
          priority: task.priority,
          dueDate: task.dueDate,
          status: task.status,
          statusName: task.statusName,
          myRoles: rows.flatMap((row) =>
            row.roleId && row.roleName
              ? [
                  {
                    roleId: row.roleId,
                    roleName: row.roleName,
                    progress: row.progress,
                  },
                ]
              : [],
          ),
          stuck: Boolean(verdict?.reason),
          stuckReason: verdict?.reason ?? null,
          stuckDays: verdict?.days ?? null,
        },
      });
    }
  }

  const result: BoardPerson[] = [];
  for (const userId of people) {
    const user = users.get(userId);
    if (!user) continue;
    const list = (entries.get(userId) ?? []).sort(compareEntries);
    result.push({
      userId,
      userName: user.name,
      userImage: user.image,
      unitNames: unitNames.get(userId) ?? [],
      counts: {
        doing: list.filter((entry) => entry.progress === "doing").length,
        overdue: list.filter((entry) => entry.overdue).length,
        stuck: list.filter((entry) => entry.card.stuck).length,
        total: list.length,
      },
      cards: list.slice(0, CARDS_PER_PERSON).map((entry) => entry.card),
    });
  }
  return result.sort(
    (a, b) =>
      a.userName.localeCompare(b.userName) || a.userId.localeCompare(b.userId),
  );
}
