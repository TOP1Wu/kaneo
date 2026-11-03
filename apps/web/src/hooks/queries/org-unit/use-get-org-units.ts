import { useQuery } from "@tanstack/react-query";
import getOrgUnits from "@/fetchers/org-unit/get-org-units";

function useGetOrgUnits(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["org-units", workspaceId],
    queryFn: () => getOrgUnits(workspaceId ?? ""),
    enabled: Boolean(workspaceId),
  });
}

export default useGetOrgUnits;
