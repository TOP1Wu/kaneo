import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import type {
  MemberProgress,
  TaskMember,
} from "@/fetchers/task-member/get-task-members";

type OnBehalfConfirmDialogProps = {
  edit: { member: TaskMember; progress: MemberProgress } | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function OnBehalfConfirmDialog({
  edit,
  onCancel,
  onConfirm,
}: OnBehalfConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <ConfirmDialog
      open={edit !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={t("tasks:members.onBehalfTitle")}
      description={
        edit
          ? t("tasks:members.onBehalfDescription", {
              name: edit.member.userName,
              role: edit.member.roleName,
              progress: t(`tasks:members.progress.${edit.progress}`),
            })
          : null
      }
      confirmLabel={t("tasks:members.onBehalfConfirm")}
      destructive={false}
      onConfirm={onConfirm}
    />
  );
}
