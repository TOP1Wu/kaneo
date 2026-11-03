import {
  evaluateStuck,
  isPastDue,
  mostBehind,
  type StuckReason,
} from "../leader-board/stuck";
import type {
  ScopedRole,
  ScopedTask,
  ScopedUser,
} from "../org-unit/scope/load-scoped-tasks";

export const STUCK_LIST_LIMIT = 50;

type StatusCount = { status: string; statusName: string; count: number };

const REASON_RANK: Record<StuckReason, number> = {
  overdue: 3,
  idle: 2,
  last_role: 1,
};

/** Status buckets in column order; the same slug in many projects merges. */
function countByStatus(tasks: readonly ScopedTask[]): StatusCount[] {
  const buckets = new Map<string, StatusCount & { position: number }>();
  for (const task of tasks) {
    const bucket = buckets.get(task.status);
    const position = task.statusPosition ?? Number.MAX_SAFE_INTEGER;
    if (bucket) {
      bucket.count += 1;
      if (position < bucket.position) {
        bucket.position = position;
        bucket.statusName = task.statusName;
      }
    } else {
      buckets.set(task.status, {
        status: task.status,
        statusName: task.statusName,
        count: 1,
        position,
      });
    }
  }
  return [...buckets.values()]
    .sort((a, b) => a.position - b.position || a.status.localeCompare(b.status))
    .map(({ position: _position, ...bucket }) => bucket);
}

/**
 * Workspace metrics over the scoped tasks. A person counts once per task in
 * the workload, at their furthest-behind progress across their roles.
 */
export function buildDashboard({
  people,
  tasks,
  users,
  roles,
  now,
  thresholdDays,
}: {
  people: readonly string[];
  tasks: readonly ScopedTask[];
  users: ReadonlyMap<string, ScopedUser>;
  roles: readonly ScopedRole[];
  now: Date;
  thresholdDays: number;
}) {
  const inScope = new Set(people);
  const workload = new Map<
    string,
    { todo: number; doing: number; done: number }
  >(people.map((userId) => [userId, { todo: 0, doing: 0, done: 0 }]));
  const roleTotals = new Map<string, { total: number; done: number }>();
  const projects = new Map<
    string,
    { projectName: string; tasks: ScopedTask[] }
  >();
  const stuckList: {
    taskId: string;
    ticket: string;
    title: string;
    projectName: string;
    stuckReason: StuckReason;
    stuckDays: number;
    blockedBy: { userId: string; userName: string; roleName: string }[];
  }[] = [];
  let overdue = 0;
  let readyForReview = 0;

  for (const task of tasks) {
    const project = projects.get(task.projectId) ?? {
      projectName: task.projectName,
      tasks: [],
    };
    project.tasks.push(task);
    projects.set(task.projectId, project);

    const progressByUser = new Map<
      string,
      Parameters<typeof mostBehind>[0][number][]
    >();
    for (const row of task.participants) {
      const list = progressByUser.get(row.userId) ?? [];
      list.push(row.progress);
      progressByUser.set(row.userId, list);
      if (row.roleId) {
        const totals = roleTotals.get(row.roleId) ?? { total: 0, done: 0 };
        totals.total += 1;
        if (row.progress === "done") totals.done += 1;
        roleTotals.set(row.roleId, totals);
      }
    }
    for (const [userId, progress] of progressByUser) {
      if (!inScope.has(userId)) continue;
      const counts = workload.get(userId);
      if (counts) counts[mostBehind(progress)] += 1;
    }

    if (task.isCompleted) continue;
    const unfinished = task.participants.some((row) => row.progress !== "done");
    if (unfinished && isPastDue(task.dueDate, now)) overdue += 1;
    if (task.participants.length > 0 && !unfinished) readyForReview += 1;

    const verdicts = evaluateStuck(
      { dueDate: task.dueDate, members: task.participants },
      now,
      thresholdDays,
    );
    let reason: StuckReason | null = null;
    let days = 0;
    const blockedBy: (typeof stuckList)[number]["blockedBy"] = [];
    for (const [userId, verdict] of verdicts) {
      if (!verdict.reason) continue;
      if (!reason || REASON_RANK[verdict.reason] > REASON_RANK[reason]) {
        reason = verdict.reason;
      }
      days = Math.max(days, verdict.days ?? 0);
      for (const row of task.participants) {
        if (row.userId !== userId || row.progress === "done") continue;
        blockedBy.push({
          userId,
          userName: users.get(userId)?.name ?? "",
          roleName: row.roleName ?? "",
        });
      }
    }
    if (reason) {
      stuckList.push({
        taskId: task.id,
        ticket: task.ticket,
        title: task.title,
        projectName: task.projectName,
        stuckReason: reason,
        stuckDays: days,
        blockedBy,
      });
    }
  }

  stuckList.sort(
    (a, b) => b.stuckDays - a.stuckDays || a.ticket.localeCompare(b.ticket),
  );

  return {
    totals: {
      tasks: tasks.length,
      overdue,
      readyForReview,
      stuck: stuckList.length,
      byStatus: countByStatus(tasks),
    },
    workload: people
      .flatMap((userId) => {
        const user = users.get(userId);
        const counts = workload.get(userId);
        return user && counts
          ? [{ userId, userName: user.name, ...counts }]
          : [];
      })
      .sort(
        (a, b) =>
          a.userName.localeCompare(b.userName) ||
          a.userId.localeCompare(b.userId),
      ),
    byProject: [...projects.entries()]
      .map(([projectId, project]) => ({
        projectId,
        projectName: project.projectName,
        byStatus: countByStatus(project.tasks),
      }))
      .sort(
        (a, b) =>
          a.projectName.localeCompare(b.projectName) ||
          a.projectId.localeCompare(b.projectId),
      ),
    roleCompletion: roles
      .filter((role) => !role.archived || roleTotals.has(role.id))
      .map((role) => ({
        roleId: role.id,
        roleName: role.name,
        total: roleTotals.get(role.id)?.total ?? 0,
        done: roleTotals.get(role.id)?.done ?? 0,
      })),
    stuckList: stuckList.slice(0, STUCK_LIST_LIMIT),
  };
}
