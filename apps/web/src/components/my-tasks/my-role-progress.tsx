import { useTranslation } from "react-i18next";
import { MemberProgressSelect } from "@/components/task-member/member-progress-select";
import type { AssignedTask } from "@/fetchers/task/get-assigned-tasks";
import { useUpdateMyProgress } from "@/hooks/mutations/task-member/use-update-my-progress";
import { toast } from "@/lib/toast";

type MyRoleProgressProps = {
  task: AssignedTask;
};

/** My roles on the task, each with my own progress, editable in place. */
export function MyRoleProgress({ task }: MyRoleProgressProps) {
  const { t } = useTranslation();
  const { mutate } = useUpdateMyProgress();

  if (task.myRoles.length === 0) {
    return (
      <span className="w-48 shrink-0 truncate text-muted-foreground text-xs">
        {t("workspace:myTasks.assigneeOnly")}
      </span>
    );
  }

  return (
    <span className="flex w-48 shrink-0 flex-col items-end gap-1 py-1">
      {task.myRoles.map((role) => (
        <span key={role.memberId} className="flex items-center gap-2">
          <span className="truncate text-muted-foreground text-xs">
            {role.roleName}
          </span>
          <MemberProgressSelect
            value={role.progress}
            disabled={false}
            label={t("workspace:myTasks.myProgressFor", {
              title: task.title,
              role: role.roleName,
            })}
            onChange={(progress) =>
              mutate(
                {
                  memberId: role.memberId,
                  taskId: task.id,
                  projectId: task.projectId,
                  progress,
                },
                {
                  onError: (error) =>
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : t("tasks:members.updateError"),
                    ),
                },
              )
            }
          />
        </span>
      ))}
    </span>
  );
}
