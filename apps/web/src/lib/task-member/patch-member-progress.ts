import type {
  MemberProgress,
  TaskMembers,
} from "@/fetchers/task-member/get-task-members";

/** The optimistic member list after one row's progress changes. */
export function patchMemberProgress(
  view: TaskMembers,
  memberId: string,
  progress: MemberProgress,
): TaskMembers {
  return {
    ...view,
    members: view.members.map((member) =>
      member.id === memberId ? { ...member, progress } : member,
    ),
  };
}
