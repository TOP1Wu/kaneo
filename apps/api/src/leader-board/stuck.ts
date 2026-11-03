import { DUE_DATE_DURATION_MS } from "../scheduler/reminder-timing";

export const PROGRESS_VALUES = ["todo", "doing", "done"] as const;
export type Progress = (typeof PROGRESS_VALUES)[number];

export const STUCK_REASONS = ["overdue", "idle", "last_role"] as const;
export type StuckReason = (typeof STUCK_REASONS)[number];

/** One task_member row, or the bare assignee when it has no member row. */
export type MemberState = {
  userId: string;
  roleId: string | null;
  progress: Progress;
  updatedAt: Date;
};

export type StuckVerdict = {
  reason: StuckReason | null;
  days: number | null;
};

export const DEFAULT_STUCK_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const PROGRESS_RANK: Record<Progress, number> = { todo: 0, doing: 1, done: 2 };

/** `KANEO_STUCK_DAYS` when it is a positive integer, otherwise 7. */
export function stuckThresholdDays(
  raw: string | undefined = process.env.KANEO_STUCK_DAYS,
): number {
  const value = raw?.trim() ?? "";
  if (!/^\d+$/.test(value)) return DEFAULT_STUCK_DAYS;
  const days = Number(value);
  return Number.isSafeInteger(days) && days > 0 ? days : DEFAULT_STUCK_DAYS;
}

/** The furthest-behind progress, so one person counts once per task. */
export function mostBehind(progress: readonly Progress[]): Progress {
  let result: Progress = "done";
  for (const value of progress) {
    if (PROGRESS_RANK[value] < PROGRESS_RANK[result]) result = value;
  }
  return result;
}

/**
 * Due dates are stored as the start of the due day, like the reminder
 * scheduler reads them: a task is overdue once its whole due day has passed.
 */
export function isPastDue(dueDate: Date | null, now: Date): boolean {
  return (
    dueDate !== null &&
    dueDate.getTime() + DUE_DATE_DURATION_MS <= now.getTime()
  );
}

/** The one role still unfinished when every other role is done, if any. */
function lastOpenRole(members: readonly MemberState[]): string | null {
  const roles = new Set<string>();
  const open = new Set<string>();
  for (const member of members) {
    if (!member.roleId) continue;
    roles.add(member.roleId);
    if (member.progress !== "done") open.add(member.roleId);
  }
  if (roles.size < 2 || open.size !== 1) return null;
  return [...open][0] ?? null;
}

/**
 * Stuck verdict for every person on one open task (design doc 6.7). A person
 * is stuck when the task is overdue and they are not done, when one of their
 * `doing` rows has not changed for more than `thresholdDays`, or when theirs is
 * the only role left unfinished. Overdue wins over idle, idle over last_role.
 * `days` counts from the most recent update of the rows that make the person
 * stuck, so finishing another role on the task does not reset it.
 */
export function evaluateStuck(
  task: { dueDate: Date | null; members: readonly MemberState[] },
  now: Date,
  thresholdDays: number,
): Map<string, StuckVerdict> {
  const byUser = new Map<string, MemberState[]>();
  for (const member of task.members) {
    const rows = byUser.get(member.userId) ?? [];
    rows.push(member);
    byUser.set(member.userId, rows);
  }

  const pastDue = isPastDue(task.dueDate, now);
  const lastRole = lastOpenRole(task.members);
  const idleBefore = now.getTime() - thresholdDays * DAY_MS;
  const verdicts = new Map<string, StuckVerdict>();

  for (const [userId, rows] of byUser) {
    const unfinished = rows.filter((row) => row.progress !== "done");
    const idle = rows.filter(
      (row) => row.progress === "doing" && row.updatedAt.getTime() < idleBefore,
    );
    const lastRoleRows = unfinished.filter((row) => row.roleId === lastRole);

    let reason: StuckReason | null = null;
    let culprits: MemberState[] = [];
    if (pastDue && unfinished.length > 0) {
      reason = "overdue";
      culprits = unfinished;
    } else if (idle.length > 0) {
      reason = "idle";
      culprits = idle;
    } else if (lastRole && lastRoleRows.length > 0) {
      reason = "last_role";
      culprits = lastRoleRows;
    }

    const latest = Math.max(...culprits.map((row) => row.updatedAt.getTime()));
    verdicts.set(userId, {
      reason,
      days:
        reason === null
          ? null
          : Math.max(0, Math.floor((now.getTime() - latest) / DAY_MS)),
    });
  }
  return verdicts;
}
