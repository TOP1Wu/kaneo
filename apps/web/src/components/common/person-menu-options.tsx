import type { OptionMenuItem } from "@/components/common/option-menu/option-menu-item";
import { UnassignedAvatar } from "@/components/common/unassigned-avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/get-initials";

export type Person = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

/** People to pick from, with the current holder marked. */
export function personMenuOptions(
  people: readonly Person[],
  current: string | null | undefined,
): OptionMenuItem[] {
  return people.map((person) => ({
    value: person.id,
    label: person.name || person.email || "",
    icon: (
      <Avatar className="size-4">
        <AvatarImage src={person.image ?? ""} alt="" />
        <AvatarFallback className="text-[8px]">
          {getInitials(person.name)}
        </AvatarFallback>
      </Avatar>
    ),
    selected: person.id === current,
  }));
}

/** The assignee picker adds "unassigned"; a role seat is always held by someone. */
export function assigneeMenuOptions(
  people: readonly Person[],
  current: string | null | undefined,
  unassignedLabel: string,
): OptionMenuItem[] {
  return [
    {
      value: "",
      label: unassignedLabel,
      icon: <UnassignedAvatar className="size-4 text-[8px]" />,
      selected: current !== undefined && !current,
    },
    ...personMenuOptions(people, current),
  ];
}
