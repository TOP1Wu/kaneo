import { Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { OptionMenu } from "@/components/common/option-menu/option-menu";
import { AssigneeAvatar } from "@/components/task/properties/assignee-avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { OrgUnit } from "@/fetchers/org-unit/get-org-units";
import type { OrgUnitMemberInput } from "@/fetchers/org-unit/replace-org-unit-members";

type WorkspacePerson = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

type OrgMembersPanelProps = {
  unit: OrgUnit;
  people: readonly WorkspacePerson[];
  pending: boolean;
  onChange: (members: OrgUnitMemberInput[]) => void;
};

export function OrgMembersPanel({
  unit,
  people,
  pending,
  onChange,
}: OrgMembersPanelProps) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const current: OrgUnitMemberInput[] = unit.members.map((member) => ({
    userId: member.userId,
    isLeader: member.isLeader,
  }));
  const inUnit = new Set(current.map((member) => member.userId));
  const addable = people.filter((person) => !inUnit.has(person.id));

  const setLeader = (userId: string, isLeader: boolean) =>
    onChange(
      current.map((member) =>
        member.userId === userId ? { ...member, isLeader } : member,
      ),
    );

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h3 className="font-medium text-sm">
          {t("settings:org.membersOf", { name: unit.name })}
        </h3>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
            >
              <UserPlus aria-hidden="true" />
              {t("settings:org.addMember")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="end">
            <OptionMenu
              label={t("settings:org.addMember")}
              placeholder={t("tasks:members.searchPeople")}
              options={addable.map((person) => ({
                value: person.id,
                label: person.name || person.email,
                hint: person.email,
                icon: (
                  <AssigneeAvatar
                    name={person.name}
                    image={person.image}
                    assigned
                    className="size-4"
                  />
                ),
              }))}
              onSelect={(userId) => {
                setPickerOpen(false);
                onChange([...current, { userId, isLeader: false }]);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      {unit.members.length === 0 ? (
        <p className="px-4 pb-4 text-muted-foreground text-sm">
          {t("settings:org.noMembers")}
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-y text-left text-muted-foreground text-xs">
              <th scope="col" className="px-4 py-2 font-medium">
                {t("settings:org.member")}
              </th>
              <th scope="col" className="w-24 px-2 py-2 font-medium">
                {t("settings:org.leader")}
              </th>
              <th scope="col" className="w-12 px-2 py-2">
                <span className="sr-only">{t("common:actions.remove")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {unit.members.map((member) => (
              <tr
                key={member.userId}
                className="border-border/60 border-b last:border-b-0"
              >
                <td className="px-4 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <AssigneeAvatar
                      name={member.userName}
                      image={member.userImage}
                      assigned
                      className="size-5"
                    />
                    <span className="truncate">{member.userName}</span>
                  </span>
                </td>
                <td className="px-2 py-2">
                  <Checkbox
                    checked={member.isLeader}
                    disabled={pending}
                    aria-label={t("settings:org.leaderFor", {
                      name: member.userName,
                    })}
                    onCheckedChange={(checked) =>
                      setLeader(member.userId, checked === true)
                    }
                  />
                </td>
                <td className="px-2 py-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={pending}
                    aria-label={t("settings:org.removeMember", {
                      name: member.userName,
                    })}
                    onClick={() =>
                      onChange(
                        current.filter(
                          (entry) => entry.userId !== member.userId,
                        ),
                      )
                    }
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
