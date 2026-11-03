import { publishEvent } from "../events";
import type { TaskScope } from "./task-scope";

export type MemberChangeAction = "added" | "removed" | "updated";

export type TaskMemberChangedEvent = {
  taskId: string;
  projectId: string;
  workspaceId: string;
  action: MemberChangeAction;
  // Only member fields, never task content, so webhook and socket payloads stay small.
  member: {
    id: string;
    userId: string;
    roleId: string;
    roleName: string;
    progress: string;
  };
  userId: string;
};

export async function publishMemberChanged(
  scope: TaskScope,
  action: MemberChangeAction,
  member: TaskMemberChangedEvent["member"],
  actorId: string,
) {
  const event: TaskMemberChangedEvent = {
    taskId: scope.taskId,
    projectId: scope.projectId,
    workspaceId: scope.workspaceId,
    action,
    member,
    userId: actorId,
  };
  await publishEvent("task.member_changed", event);
}
