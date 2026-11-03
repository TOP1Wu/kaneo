import { useQuery } from "@tanstack/react-query";
import getTaskMembers from "@/fetchers/task-member/get-task-members";

function useGetTaskMembers(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task-members", taskId],
    queryFn: () => getTaskMembers(taskId ?? ""),
    enabled: Boolean(taskId),
  });
}

export default useGetTaskMembers;
