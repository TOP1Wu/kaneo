import { keepPreviousData, useQuery } from "@tanstack/react-query";
import getDashboard from "@/fetchers/dashboard/get-dashboard";
import type {
  DashboardRange,
  ScopeSelection,
} from "@/lib/org-scope/scope-query";

function useGetDashboard(
  workspaceId: string,
  selection: ScopeSelection,
  projectIds: string[],
  range: DashboardRange,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["dashboard", workspaceId, selection, projectIds, range],
    queryFn: () => getDashboard(workspaceId, selection, projectIds, range),
    enabled: enabled && Boolean(workspaceId),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

export default useGetDashboard;
