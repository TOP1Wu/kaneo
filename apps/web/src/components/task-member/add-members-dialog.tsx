import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AssigneeAvatar } from "@/components/task/properties/assignee-avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskMember } from "@/fetchers/task-member/get-task-members";
import type { TaskRole } from "@/fetchers/task-role/get-task-roles";

export type Candidate = {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
};

type AddMembersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: readonly TaskRole[];
  candidates: readonly Candidate[];
  members: readonly TaskMember[];
  pending: boolean;
  onSubmit: (roleId: string, userIds: string[]) => void;
};

export function AddMembersDialog({
  open,
  onOpenChange,
  roles,
  candidates,
  members,
  pending,
  onSubmit,
}: AddMembersDialogProps) {
  const { t } = useTranslation();
  const [roleId, setRoleId] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const activeRoleId = roleId ?? roles.find((role) => !role.isOwnerRole)?.id;
  const role = roles.find((entry) => entry.id === activeRoleId);

  // People who already hold the role are not offered again for it.
  const taken = useMemo(
    () =>
      new Set(
        members
          .filter((member) => member.roleId === activeRoleId)
          .map((member) => member.userId),
      ),
    [members, activeRoleId],
  );
  const needle = query.trim().toLowerCase();
  const visible = candidates.filter(
    (candidate) =>
      !taken.has(candidate.id) &&
      `${candidate.name} ${candidate.email ?? ""}`
        .toLowerCase()
        .includes(needle),
  );

  const toggle = (userId: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(userId);
      else next.delete(userId);
      return next;
    });
  };

  const reset = (nextOpen: boolean) => {
    if (!nextOpen) {
      setQuery("");
      setSelected(new Set());
      setRoleId(undefined);
    }
    onOpenChange(nextOpen);
  };

  const userIds = [...selected].filter((id) => !taken.has(id));

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogPopup className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("tasks:members.addTitle")}</DialogTitle>
          <DialogDescription>
            {t("tasks:members.addDescription")}
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-3">
          <Select
            value={activeRoleId ?? null}
            onValueChange={(value) => {
              if (typeof value === "string") setRoleId(value);
            }}
          >
            <SelectTrigger size="sm" aria-label={t("tasks:members.role")}>
              <SelectValue placeholder={t("tasks:members.rolePlaceholder")}>
                {role?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {roles.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {entry.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("tasks:members.searchPeople")}
            aria-label={t("tasks:members.searchPeople")}
            size="sm"
          />
          <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
            {visible.length === 0 ? (
              <li className="px-2 py-3 text-muted-foreground text-xs">
                {t("tasks:members.noCandidates")}
              </li>
            ) : (
              visible.map((candidate) => (
                <li key={candidate.id}>
                  <label className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 hover:bg-accent">
                    <Checkbox
                      checked={selected.has(candidate.id)}
                      onCheckedChange={(checked) =>
                        toggle(candidate.id, checked === true)
                      }
                    />
                    <AssigneeAvatar
                      name={candidate.name}
                      image={candidate.image}
                      assigned
                      className="size-5"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {candidate.name}
                    </span>
                    {candidate.email && (
                      <span className="truncate text-muted-foreground text-xs">
                        {candidate.email}
                      </span>
                    )}
                  </label>
                </li>
              ))
            )}
          </ul>
        </DialogPanel>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => reset(false)}
          >
            {t("common:actions.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!activeRoleId || userIds.length === 0 || pending}
            onClick={() => activeRoleId && onSubmit(activeRoleId, userIds)}
          >
            {t("tasks:members.addCount", { count: userIds.length })}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
