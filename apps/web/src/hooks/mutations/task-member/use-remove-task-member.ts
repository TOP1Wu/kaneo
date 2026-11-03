import { useMutation, useQueryClient } from "@tanstack/react-query";
import removeTaskMember from "@/fetchers/task-member/remove-task-member";
import { invalidateTaskMemberQueries } from "@/lib/task-member/invalidate-task-member-queries";

export function useRemoveTaskMember(projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => removeTaskMember(memberId),
    onSuccess: ({ taskId }) => {
      invalidateTaskMemberQueries(queryClient, { taskId, projectId });
    },
  });
}
