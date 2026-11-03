import type { QueryClient } from "@tanstack/react-query";
import { invalidateMyWork } from "@/lib/invalidate-my-work";

type MemberChange = {
  taskId?: string;
  projectId?: string;
};

// A member change moves the task's member list, the card progress summary,
// the timeline, the assignee (the first primary owner mirrors it), "My tasks",
// and the workspace-wide leader board and dashboard.
export function invalidateTaskMemberQueries(
  queryClient: QueryClient,
  { taskId, projectId }: MemberChange,
) {
  if (taskId) {
    void queryClient.invalidateQueries({ queryKey: ["task-members", taskId] });
    void queryClient.invalidateQueries({ queryKey: ["activities", taskId] });
    void queryClient.invalidateQueries({ queryKey: ["task", taskId] });
  }
  void queryClient.invalidateQueries({
    queryKey: projectId
      ? ["task-member-summaries", projectId]
      : ["task-member-summaries"],
  });
  if (projectId) {
    void queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
  }
  invalidateMyWork(queryClient);
  void queryClient.invalidateQueries({ queryKey: ["leader-board"] });
  void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
}
