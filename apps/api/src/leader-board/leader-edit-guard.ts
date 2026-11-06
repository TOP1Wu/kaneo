import { getLedUnits } from "../org-unit/get-led-units";

/** The fields the guard reads; any task_member row satisfies it. */
export type GuardedMember = { userId: string; workspaceId: string };

/**
 * Lets an org leader edit the progress of anyone below them (recursively) on
 * a task in the same workspace.
 */
export async function leaderEditGuard(
  actorId: string,
  member: GuardedMember,
): Promise<boolean> {
  if (actorId === member.userId) return false;
  const { subordinateUserIds } = await getLedUnits(member.workspaceId, actorId);
  return subordinateUserIds.includes(member.userId);
}
