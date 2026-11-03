import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import getTaskMemberSummaries from "@/fetchers/task-member/get-task-member-summaries";
import { chunk } from "@/lib/chunk";

// The API caps one request at 200 task IDs.
const MAX_IDS_PER_REQUEST = 200;

/**
 * Member summaries for every task on a board in one query. Large boards split
 * into a few parallel requests, never one per card.
 */
function useTaskMemberSummaries(projectId: string, taskIds: readonly string[]) {
  const sortedIds = useMemo(() => [...new Set(taskIds)].sort(), [taskIds]);

  return useQuery({
    queryKey: ["task-member-summaries", projectId, sortedIds],
    queryFn: async () => {
      const pages = await Promise.all(
        chunk(sortedIds, MAX_IDS_PER_REQUEST).map(getTaskMemberSummaries),
      );
      return new Map(
        pages.flatMap((page) =>
          page.summaries.map((summary) => [summary.taskId, summary] as const),
        ),
      );
    },
    enabled: Boolean(projectId) && sortedIds.length > 0,
    // Keep cards steady while a new task joins the board and the batch refetches.
    placeholderData: keepPreviousData,
  });
}

export default useTaskMemberSummaries;
