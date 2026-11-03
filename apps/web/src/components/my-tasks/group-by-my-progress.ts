import type { AssignedTask } from "@/fetchers/task/get-assigned-tasks";
import type { AssignedTaskGroup } from "@/components/my-work/group-assigned-tasks";

export type MyProgressBucket = "todo" | "doing" | "done" | "assigneeOnly";

export const MY_PROGRESS_BUCKETS: readonly MyProgressBucket[] = [
  "doing",
  "todo",
  "done",
  "assigneeOnly",
];

/**
 * A task with several of my roles sits where my furthest-behind role is, the
 * same rule the leader board uses. Assignee-only tasks have no row of mine.
 */
export function myProgressBucket(task: AssignedTask): MyProgressBucket {
  const progress = task.myRoles.map((role) => role.progress);
  if (progress.length === 0) return "assigneeOnly";
  if (progress.includes("todo")) return "todo";
  if (progress.includes("doing")) return "doing";
  return "done";
}

export function groupAssignedTasksByMyProgress(
  tasks: AssignedTask[],
): Array<AssignedTaskGroup & { progress: MyProgressBucket }> {
  const byBucket = new Map<MyProgressBucket, AssignedTask[]>();
  for (const task of tasks) {
    const bucket = myProgressBucket(task);
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), task]);
  }
  return MY_PROGRESS_BUCKETS.flatMap((bucket) => {
    const group = byBucket.get(bucket);
    return group
      ? [{ id: `progress-${bucket}`, progress: bucket, tasks: group }]
      : [];
  });
}
