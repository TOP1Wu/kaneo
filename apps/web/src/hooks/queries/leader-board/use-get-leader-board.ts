import { keepPreviousData, useQuery } from "@tanstack/react-query";
import getLeaderBoard from "@/fetchers/leader-board/get-leader-board";
import type { BoardFilters, ScopeSelection } from "@/lib/org-scope/scope-query";

function useGetLeaderBoard(
  workspaceId: string,
  selection: ScopeSelection,
  filters: BoardFilters,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["leader-board", workspaceId, selection, filters],
    queryFn: () => getLeaderBoard(workspaceId, selection, filters),
    enabled: enabled && Boolean(workspaceId),
    placeholderData: keepPreviousData,
    // No socket spans the whole workspace; poll while the page is open.
    refetchInterval: 60_000,
  });
}

export default useGetLeaderBoard;
