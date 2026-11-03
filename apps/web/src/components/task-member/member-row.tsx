import { useTranslation } from "react-i18next";
import { AssigneeAvatar } from "@/components/task/properties/assignee-avatar";
import { sectionRowClass } from "@/components/task/sections/section-row-class";
import type {
  MemberProgress,
  TaskMember,
} from "@/fetchers/task-member/get-task-members";
import type { TaskRole } from "@/fetchers/task-role/get-task-roles";
import { cn } from "@/lib/cn";
import { formatDateShort } from "@/lib/format";
import type { ProgressAccess } from "@/lib/task-member/member-access";
import { MemberActionsMenu } from "./member-actions-menu";
import { MemberProgressSelect } from "./member-progress-select";

type MemberRowProps = {
  member: TaskMember;
  isSelf: boolean;
  access: ProgressAccess;
  canManage: boolean;
  roles: readonly TaskRole[];
  onProgress: (member: TaskMember, progress: MemberProgress) => void;
  onChangeRole: (member: TaskMember, roleId: string) => void;
  onRemove: (member: TaskMember) => void;
};

export function MemberRow({
  member,
  isSelf,
  access,
  canManage,
  roles,
  onProgress,
  onChangeRole,
  onRemove,
}: MemberRowProps) {
  const { t } = useTranslation();

  return (
    <li className={cn(sectionRowClass, "hover:bg-accent/50")}>
      <AssigneeAvatar
        name={member.userName}
        image={member.userImage}
        assigned
        className="size-5"
      />
      <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
        {member.userName}
        {isSelf && (
          <span className="ml-1.5 text-muted-foreground text-xs">
            {t("tasks:members.you")}
          </span>
        )}
      </span>
      {member.doneAt && member.progress === "done" && (
        <span
          className="hidden shrink-0 text-muted-foreground text-xs tabular-nums sm:inline"
          title={t("tasks:members.doneAt")}
        >
          {formatDateShort(member.doneAt)}
        </span>
      )}
      <MemberProgressSelect
        value={member.progress}
        disabled={!access.canEdit}
        label={t("tasks:members.progressFor", {
          name: member.userName,
          role: member.roleName,
        })}
        onChange={(progress) => onProgress(member, progress)}
      />
      {canManage ? (
        <MemberActionsMenu
          memberName={member.userName}
          roleId={member.roleId}
          roles={roles}
          onChangeRole={(roleId) => onChangeRole(member, roleId)}
          onRemove={() => onRemove(member)}
        />
      ) : (
        <span aria-hidden="true" className="size-7 shrink-0" />
      )}
    </li>
  );
}
