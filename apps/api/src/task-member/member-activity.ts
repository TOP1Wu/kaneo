import { activityTable } from "../database/schema";
import type { DbOrTx } from "../project-access/db-or-tx";

export type MemberActivityType =
  | "member_added"
  | "member_removed"
  | "member_role_changed"
  | "member_progress_changed"
  | "task_ready_for_review";

export type MemberActivityData = {
  memberUserId: string;
  memberUserName: string;
  roleId: string;
  roleName: string;
  from?: string;
  to?: string;
  onBehalfOf?: boolean;
};

export type MemberActivity = {
  type: MemberActivityType;
  data: MemberActivityData;
};

/** Writes member activity in the caller's transaction; `userId` is the actor. */
export async function recordMemberActivities(
  tx: DbOrTx,
  taskId: string,
  actorId: string | null,
  activities: readonly MemberActivity[],
) {
  if (activities.length === 0) return;
  await tx.insert(activityTable).values(
    activities.map(({ type, data }) => ({
      taskId,
      type,
      userId: actorId,
      content: null,
      eventData: data,
    })),
  );
}

/** One extra entry the moment the task goes from not-all-done to all-done. */
export function readyForReviewActivity(
  wasReady: boolean,
  isReady: boolean,
  trigger: MemberActivityData,
): MemberActivity[] {
  return !wasReady && isReady
    ? [{ type: "task_ready_for_review", data: trigger }]
    : [];
}
