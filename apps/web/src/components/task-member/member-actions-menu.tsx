import { EllipsisIcon, Tags, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from "@/components/ui/menu";
import type { TaskRole } from "@/fetchers/task-role/get-task-roles";

type MemberActionsMenuProps = {
  memberName: string;
  roleId: string;
  roles: readonly TaskRole[];
  onChangeRole: (roleId: string) => void;
  onRemove: () => void;
};

export function MemberActionsMenu({
  memberName,
  roleId,
  roles,
  onChangeRole,
  onRemove,
}: MemberActionsMenuProps) {
  const { t } = useTranslation();

  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("tasks:members.actionsFor", { name: memberName })}
            className="text-muted-foreground"
          />
        }
      >
        <EllipsisIcon aria-hidden="true" />
      </MenuTrigger>
      <MenuPopup align="end">
        <MenuSub>
          <MenuSubTrigger>
            <Tags aria-hidden="true" />
            {t("tasks:members.changeRole")}
          </MenuSubTrigger>
          <MenuSubPopup>
            <MenuRadioGroup
              value={roleId}
              onValueChange={(value) => {
                if (typeof value === "string" && value !== roleId)
                  onChangeRole(value);
              }}
            >
              {roles.map((role) => (
                <MenuRadioItem key={role.id} value={role.id} closeOnClick>
                  {role.name}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuSubPopup>
        </MenuSub>
        <MenuSeparator />
        <MenuItem closeOnClick variant="destructive" onClick={onRemove}>
          <Trash2 aria-hidden="true" />
          {t("tasks:members.remove")}
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}
