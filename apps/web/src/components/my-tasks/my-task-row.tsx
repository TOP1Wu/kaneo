import { AssignedTaskRow } from "@/components/my-work/assigned-task-row";
import type { AssignedTask } from "@/fetchers/task/get-assigned-tasks";
import { MyRoleProgress } from "./my-role-progress";

type MyTaskRowProps = {
  task: AssignedTask;
  workspaceId: string;
};

// The progress controls sit beside the row's link, never inside it.
export function MyTaskRow({ task, workspaceId }: MyTaskRowProps) {
  return (
    <div className="flex items-center gap-3 border-border/50 border-b">
      <div className="min-w-0 flex-1 [&>a]:border-b-0">
        <AssignedTaskRow task={task} workspaceId={workspaceId} showLabels />
      </div>
      <MyRoleProgress task={task} />
    </div>
  );
}
