import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AssignedTasks } from "@/fetchers/task/get-assigned-tasks";
import type { MemberProgress } from "@/fetchers/task-member/get-task-members";
import updateTaskMember from "@/fetchers/task-member/update-task-member";
import { invalidateTaskMemberQueries } from "@/lib/task-member/invalidate-task-member-queries";

type UpdateMyProgressVariables = {
  memberId: string;
  taskId: string;
  projectId: string;
  progress: MemberProgress;
};

function patchAssigned(
  data: AssignedTasks | undefined,
  memberId: string,
  progress: MemberProgress,
) {
  if (!data) return data;
  return {
    ...data,
    tasks: data.tasks.map((task) => ({
      ...task,
      myRoles: task.myRoles.map((role) =>
        role.memberId === memberId ? { ...role, progress } : role,
      ),
    })),
  };
}

/** My own progress from "My tasks": shown at once, rolled back on failure. */
export function useUpdateMyProgress() {
  const queryClient = useQueryClient();
  const listKey = { queryKey: ["assigned-tasks"] };

  return useMutation({
    mutationFn: ({ memberId, progress }: UpdateMyProgressVariables) =>
      updateTaskMember(memberId, { progress }),
    onMutate: async ({ memberId, progress }) => {
      await queryClient.cancelQueries(listKey);
      const previous = queryClient.getQueriesData<AssignedTasks>(listKey);
      queryClient.setQueriesData<AssignedTasks>(listKey, (data) =>
        patchAssigned(data, memberId, progress),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      for (const [queryKey, data] of context?.previous ?? []) {
        queryClient.setQueryData(queryKey, data);
      }
    },
    onSettled: (_data, _error, { taskId, projectId }) => {
      invalidateTaskMemberQueries(queryClient, { taskId, projectId });
    },
  });
}
