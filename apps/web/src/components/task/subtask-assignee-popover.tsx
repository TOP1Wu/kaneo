import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PersonPicker } from "@/components/common/person-picker";
import { assigneeMenuOptions } from "@/components/common/person-menu-options";
import { useUpdateTaskAssignee } from "@/hooks/mutations/task/use-update-task-assignee";
import useGetMembersOfProjects from "@/hooks/queries/workspace-users/use-get-members-of-projects";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { toast } from "@/lib/toast";
import type Task from "@/types/task";

type SubtaskAssigneePopoverProps = {
  tasks: Task[];
  workspaceId: string;
  children: React.ReactNode;
};

export default function SubtaskAssigneePopover({
  tasks,
  workspaceId,
  children,
}: SubtaskAssigneePopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { mutateAsync: updateTaskAssignee } = useUpdateTaskAssignee();
  const { data: members = [] } = useGetMembersOfProjects({
    workspaceId,
    projectIds: tasks.map((task) => task.projectId),
  });
  const { canAssignTasks } = useWorkspacePermission();

  if (!canAssignTasks()) return <>{children}</>;

  const current = tasks.every((task) => task.userId === tasks[0]?.userId)
    ? (tasks[0]?.userId ?? null)
    : undefined;

  const changeAssignee = async (userId: string) => {
    setOpen(false);
    try {
      await Promise.all(
        tasks.map((task) => updateTaskAssignee({ ...task, userId })),
      );
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
      modal={false}
      label={t("tasks:assignee.label")}
      placeholder={t("tasks:bulk.assigneePlaceholder")}
      options={assigneeMenuOptions(
        members,
        current,
        t("tasks:popover.assignee.unassigned"),
      )}
      onSelect={changeAssignee}
    >
      {children}
    </PersonPicker>
  );
}
