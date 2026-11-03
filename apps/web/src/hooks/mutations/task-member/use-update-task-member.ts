import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TaskMembers } from "@/fetchers/task-member/get-task-members";
import updateTaskMember, {
  type UpdateTaskMemberBody,
} from "@/fetchers/task-member/update-task-member";
import { invalidateTaskMemberQueries } from "@/lib/task-member/invalidate-task-member-queries";
import { patchMemberProgress } from "@/lib/task-member/patch-member-progress";

type UpdateTaskMemberVariables = {
  memberId: string;
  taskId: string;
  projectId?: string;
  body: UpdateTaskMemberBody;
};

// Progress shows the change immediately. The API decides whether the caller
// may edit someone else's row (a leader's on-behalf edit included); a 403 rolls
// the row back and the caller shows the error.
export function useUpdateTaskMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, body }: UpdateTaskMemberVariables) =>
      updateTaskMember(memberId, body),
    onMutate: async ({ memberId, taskId, body }) => {
      const queryKey = ["task-members", taskId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TaskMembers>(queryKey);
      if (previous && body.progress) {
        queryClient.setQueryData(
          queryKey,
          patchMemberProgress(previous, memberId, body.progress),
        );
      }
      return { previous };
    },
    onError: (_error, { taskId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["task-members", taskId], context.previous);
      }
    },
    onSuccess: (data, { taskId }) => {
      queryClient.setQueryData(["task-members", taskId], data);
    },
    onSettled: (_data, _error, { taskId, projectId }) => {
      invalidateTaskMemberQueries(queryClient, { taskId, projectId });
    },
  });
}
