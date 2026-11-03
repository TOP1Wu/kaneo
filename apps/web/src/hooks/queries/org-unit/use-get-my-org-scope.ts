import { useQuery } from "@tanstack/react-query";
import getMyOrgScope from "@/fetchers/org-unit/get-my-org-scope";

function useGetMyOrgScope(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["org-scope", workspaceId],
    queryFn: () => getMyOrgScope(workspaceId ?? ""),
    enabled: Boolean(workspaceId),
    staleTime: 60 * 1000,
  });
}

export default useGetMyOrgScope;
