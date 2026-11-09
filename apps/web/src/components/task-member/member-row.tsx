import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PersonPicker } from "@/components/common/person-picker";
import {
  type Person,
  personMenuOptions,
} from "@/components/common/person-menu-options";
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
  /** People who may take this seat; the current holder is included. */
  candidates: readonly Person[];
  onProgress: (member: TaskMember, progress: MemberProgress) => void;
  onChangeRole: (member: TaskMember, roleId: string) => void;
  onChangePerson: (member: TaskMember, userId: string) => void;
  onRemove: (member: TaskMember) => void;
};

export function MemberRow({
  member,
  isSelf,
  access,
  canManage,
  roles,
  candidates,
  onProgress,
  onChangeRole,
  onChangePerson,
  onRemove,
}: MemberRowProps) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const personLabel = t("tasks:members.changePersonFor", {
    name: member.userName,
  });

  const person = (
    <>
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
    </>
  );

  return (
    <li className={cn(sectionRowClass, "hover:bg-accent/50")}>
      {canManage ? (
        <PersonPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          label={personLabel}
          placeholder={t("tasks:members.searchPeople")}
          options={personMenuOptions(candidates, member.userId)}
          onSelect={(userId) => {
            setPickerOpen(false);
            if (userId !== member.userId) onChangePerson(member, userId);
          }}
        >
          <button
            type="button"
            aria-label={personLabel}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 self-stretch rounded-sm text-left outline-none hover:underline hover:decoration-dotted hover:underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {person}
          </button>
        </PersonPicker>
      ) : (
        person
      )}
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
