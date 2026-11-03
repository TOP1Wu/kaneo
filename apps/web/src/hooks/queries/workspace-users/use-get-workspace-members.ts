import { useQuery } from "@tanstack/react-query";
import getProjectMembers from "@/fetchers/workspace-user/get-project-members";

/** Every member of the workspace, with name, email and image. */
function useGetWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["workspace-users", workspaceId, "all-members"],
    queryFn: () => getProjectMembers({ workspaceId: workspaceId ?? "" }),
    enabled: Boolean(workspaceId),
  });
}

export default useGetWorkspaceMembers;
