import { useMutation, useQueryClient } from "@tanstack/react-query";
import addTaskMembers, {
  type AddTaskMembersRequest,
} from "@/fetchers/task-member/add-task-members";
import { invalidateTaskMemberQueries } from "@/lib/task-member/invalidate-task-member-queries";

export function useAddTaskMembers(projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AddTaskMembersRequest) => addTaskMembers(request),
    onSuccess: (data, { taskId }) => {
      queryClient.setQueryData(["task-members", taskId], data);
      invalidateTaskMemberQueries(queryClient, { taskId, projectId });
    },
  });
}
