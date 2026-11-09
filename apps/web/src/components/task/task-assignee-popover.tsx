import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PersonPicker } from "@/components/common/person-picker";
import { assigneeMenuOptions } from "@/components/common/person-menu-options";
import { useUpdateTaskAssignee } from "@/hooks/mutations/task/use-update-task-assignee";
import useGetProjectMembers from "@/hooks/queries/workspace-users/use-get-project-members";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { toast } from "@/lib/toast";
import type Task from "@/types/task";

type TaskAssigneePopoverProps = {
  task: Task;
  workspaceId: string;
  children: React.ReactNode;
};

export default function TaskAssigneePopover({
  task,
  workspaceId,
  children,
}: TaskAssigneePopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { mutateAsync: updateTaskAssignee } = useUpdateTaskAssignee();
  const { data: members = [] } = useGetProjectMembers({
    workspaceId,
    projectId: task.projectId,
  });
  const { canAssignTasks } = useWorkspacePermission();

  if (!canAssignTasks()) return <>{children}</>;

  const changeAssignee = async (userId: string) => {
    setOpen(false);
    try {
      await updateTaskAssignee({ ...task, userId });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("tasks:popover.assignee.updateError"),
      );
    }
  };

  return (
    <PersonPicker
      open={open}
      onOpenChange={setOpen}
      label={t("tasks:assignee.label")}
      placeholder={t("tasks:bulk.assigneePlaceholder")}
      options={assigneeMenuOptions(
        members,
        task.userId ?? null,
        t("tasks:popover.assignee.unassigned"),
      )}
      onSelect={changeAssignee}
    >
      {children}
    </PersonPicker>
  );
}
