import { createContext, useContext } from "react";
import type { TaskMemberSummary } from "@/fetchers/task-member/get-task-member-summaries";

export const TaskMemberSummaryContext = createContext<
  ReadonlyMap<string, TaskMemberSummary> | undefined
>(undefined);

/** A card's member summary from the board-level batch; undefined outside it. */
export function useTaskMemberSummary(taskId: string) {
  return useContext(TaskMemberSummaryContext)?.get(taskId);
}
