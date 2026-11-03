import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import { taskTable } from "../database/schema";
import type { DbOrTx } from "../project-access/db-or-tx";
import { type LoadedMember, loadTaskMembers } from "./load-task-members";
import {
  type AssigneeChange,
  syncPrimaryAssignee,
} from "./sync-primary-assignee";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Runs a member mutation under the task row lock, then re-syncs the assignee
 * mirror. `members` is the state before the mutation.
 */
export async function withLockedTaskMembers<T>(
  taskId: string,
  mutate: (tx: Tx, members: LoadedMember[]) => Promise<T>,
): Promise<{ result: T; assigneeChange: AssigneeChange | null }> {
  return db.transaction(async (tx) => {
    const [task] = await tx
      .select({ id: taskTable.id })
      .from(taskTable)
      .where(eq(taskTable.id, taskId))
      .for("update");
    if (!task) throw new HTTPException(404, { message: "Task not found" });
    const members = await loadTaskMembers(taskId, tx);
    const result = await mutate(tx, members);
    return { result, assigneeChange: await syncPrimaryAssignee(tx, taskId) };
  });
}

export function allDone(members: readonly { progress: string }[]) {
  return members.length > 0 && members.every((m) => m.progress === "done");
}

export type { DbOrTx };
