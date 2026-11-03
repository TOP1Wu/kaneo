import { loadTaskMember } from "./load-task-members";
import { publishMemberChanged } from "./publish-member-changed";
import type { EnsuredMember } from "./sync-primary-assignee";
import { loadTaskScope } from "./task-scope";

/** Publishes the membership `ensureAssigneeIsPrimaryMember` created or moved. */
export async function publishEnsuredMember(
  ensured: EnsuredMember | null,
  actorId: string | null | undefined,
) {
  if (!ensured) return;
  const member = await loadTaskMember(ensured.memberId);
  if (!member) return;
  await publishMemberChanged(
    await loadTaskScope(member.taskId),
    ensured.action,
    {
      id: member.id,
      userId: member.userId,
      roleId: member.roleId,
      roleName: member.roleName,
      progress: member.progress,
    },
    actorId ?? "",
  );
}
