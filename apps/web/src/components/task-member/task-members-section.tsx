import { useState } from "react";
import { useTranslation } from "react-i18next";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import { SectionAddButton } from "@/components/task/sections/section-add-button";
import { SectionHeader } from "@/components/task/sections/section-header";
import type {
  MemberProgress,
  TaskMember,
} from "@/fetchers/task-member/get-task-members";
import { useAddTaskMembers } from "@/hooks/mutations/task-member/use-add-task-members";
import { useRemoveTaskMember } from "@/hooks/mutations/task-member/use-remove-task-member";
import { useUpdateTaskMember } from "@/hooks/mutations/task-member/use-update-task-member";
import useGetMyOrgScope from "@/hooks/queries/org-unit/use-get-my-org-scope";
import useGetTaskMembers from "@/hooks/queries/task-member/use-get-task-members";
import useGetTaskRoles from "@/hooks/queries/task-role/use-get-task-roles";
import useGetProjectMembers from "@/hooks/queries/workspace-users/use-get-project-members";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { toast } from "@/lib/toast";
import { groupMembersByRole } from "@/lib/task-member/group-members-by-role";
import {
  canManageMembers,
  type MemberViewer,
  progressAccess,
} from "@/lib/task-member/member-access";
import { AddMembersDialog } from "./add-members-dialog";
import { MemberRow } from "./member-row";
import { OnBehalfConfirmDialog } from "./on-behalf-confirm-dialog";
import { ReadyForReviewBadge } from "./ready-for-review-badge";

type TaskMembersSectionProps = {
  taskId: string;
  projectId: string;
  workspaceId: string;
};

type PendingEdit = { member: TaskMember; progress: MemberProgress };

export function TaskMembersSection({
  taskId,
  projectId,
  workspaceId,
}: TaskMembersSectionProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { canUpdateTasks, canManageSettings } = useWorkspacePermission();
  const { data, isPending, isError } = useGetTaskMembers(taskId);
  const { data: roleList } = useGetTaskRoles(workspaceId);
  const { data: scope } = useGetMyOrgScope(workspaceId);
  const { data: projectMembers = [] } = useGetProjectMembers({
    workspaceId,
    projectId,
  });
  const updateMember = useUpdateTaskMember();
  const addMembers = useAddTaskMembers(projectId);
  const removeMember = useRemoveTaskMember(projectId);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);

  const members = data?.members ?? [];
  const roles = roleList?.roles ?? [];
  const activeRoles = roles.filter((role) => !role.archived);
  const viewer: MemberViewer = {
    userId: user?.id,
    canUpdateTasks: canUpdateTasks(),
    canManageSettings: canManageSettings(),
    subordinateUserIds: scope?.subordinateUserIds ?? [],
  };
  const canManage = canManageMembers(members, viewer);
  const groups = groupMembersByRole(members, roles);

  const fail = (error: unknown, fallbackKey: string) =>
    toast.error(error instanceof Error ? error.message : t(fallbackKey));

  const saveProgress = (member: TaskMember, progress: MemberProgress) => {
    updateMember.mutate(
      { memberId: member.id, taskId, projectId, body: { progress } },
      { onError: (error) => fail(error, "tasks:members.updateError") },
    );
  };

  const requestProgress = (member: TaskMember, progress: MemberProgress) => {
    if (progressAccess(member, members, viewer).onBehalf) {
      setPendingEdit({ member, progress });
      return;
    }
    saveProgress(member, progress);
  };

  const changeRole = (member: TaskMember, roleId: string) => {
    updateMember.mutate(
      { memberId: member.id, taskId, projectId, body: { roleId } },
      { onError: (error) => fail(error, "tasks:members.updateError") },
    );
  };

  const remove = (member: TaskMember) => {
    removeMember.mutate(member.id, {
      onError: (error) => fail(error, "tasks:members.removeError"),
    });
  };

  const add = (roleId: string, userIds: string[]) => {
    addMembers.mutate(
      { taskId, roleId, userIds },
      {
        onSuccess: () => setAddOpen(false),
        onError: (error) => fail(error, "tasks:members.addError"),
      },
    );
  };

  return (
    <section
      aria-label={t("tasks:members.title")}
      className="flex flex-col gap-1"
    >
      <SectionHeader
        title={t("tasks:members.title")}
        meta={data?.readyForReview ? <ReadyForReviewBadge /> : null}
        action={
          canManage ? (
            <SectionAddButton
              aria-label={t("tasks:members.add")}
              title={t("tasks:members.add")}
              onClick={() => setAddOpen(true)}
            />
          ) : null
        }
      />

      {isPending ? (
        <p className="px-2 py-1 text-muted-foreground text-xs">
          {t("common:empty.loading")}
        </p>
      ) : isError ? (
        <p
          role="alert"
          className="px-2 py-1 text-destructive-foreground text-xs"
        >
          {t("tasks:members.loadError")}
        </p>
      ) : groups.length === 0 ? (
        <p className="px-2 py-1 text-muted-foreground text-xs">
          {t("tasks:members.empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((group) => {
            const done = group.members.filter(
              (member) => member.progress === "done",
            ).length;
            return (
              <div key={group.roleId} className="flex flex-col">
                <h4 className="flex h-6 items-center gap-1.5 px-2 font-medium text-muted-foreground text-xs">
                  {group.roleName}
                  <span className="tabular-nums">
                    {done}/{group.members.length}
                  </span>
                </h4>
                <ul className="flex flex-col">
                  {group.members.map((member) => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      isSelf={member.userId === user?.id}
                      access={progressAccess(member, members, viewer)}
                      canManage={canManage}
                      roles={activeRoles}
                      onProgress={requestProgress}
                      onChangeRole={changeRole}
                      onRemove={remove}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <AddMembersDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        roles={activeRoles}
        candidates={projectMembers.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          image: member.image,
        }))}
        members={members}
        pending={addMembers.isPending}
        onSubmit={add}
      />

      <OnBehalfConfirmDialog
        edit={pendingEdit}
        onCancel={() => setPendingEdit(null)}
        onConfirm={() => {
          if (pendingEdit)
            saveProgress(pendingEdit.member, pendingEdit.progress);
          setPendingEdit(null);
        }}
      />
    </section>
  );
}
