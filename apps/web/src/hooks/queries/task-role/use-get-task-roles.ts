import { useQuery } from "@tanstack/react-query";
import getTaskRoles from "@/fetchers/task-role/get-task-roles";

function useGetTaskRoles(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["task-roles", workspaceId],
    queryFn: () => getTaskRoles(workspaceId ?? ""),
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60 * 1000,
  });
}

export default useGetTaskRoles;
