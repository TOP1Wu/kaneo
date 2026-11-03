import type { ReactNode } from "react";
import useTaskMemberSummaries from "@/hooks/queries/task-member/use-task-member-summaries";
import { TaskMemberSummaryContext } from "./task-member-summary-context";

type TaskMemberSummaryProviderProps = {
  projectId: string;
  taskIds: readonly string[];
  children: ReactNode;
};

export function TaskMemberSummaryProvider({
  projectId,
  taskIds,
  children,
}: TaskMemberSummaryProviderProps) {
  const { data } = useTaskMemberSummaries(projectId, taskIds);

  return (
    <TaskMemberSummaryContext.Provider value={data}>
      {children}
    </TaskMemberSummaryContext.Provider>
  );
}
