import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrgUnit } from "@/fetchers/org-unit/get-org-units";
import { flattenOrgTree, subtreeIds } from "./org-tree";

const ROOT = "__root__";

export type OrgUnitDraft = { name: string; parentId: string | null };

type OrgUnitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: readonly OrgUnit[];
  /** The unit being edited, or null to create one. */
  unit: OrgUnit | null;
  defaultParentId: string | null;
  pending: boolean;
  onSubmit: (draft: OrgUnitDraft) => void;
};

export function OrgUnitDialog({
  open,
  onOpenChange,
  units,
  unit,
  defaultParentId,
  pending,
  onSubmit,
}: OrgUnitDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>(ROOT);

  useEffect(() => {
    if (!open) return;
    setName(unit?.name ?? "");
    setParentId((unit ? unit.parentId : defaultParentId) ?? ROOT);
  }, [open, unit, defaultParentId]);

  // A unit can't move under itself or one of its descendants.
  const blocked = unit ? subtreeIds(units, unit.id) : new Set<string>();
  const parents = flattenOrgTree(units).filter(
    (row) => !blocked.has(row.unit.id),
  );
  const parentName =
    parentId === ROOT
      ? t("settings:org.noParent")
      : units.find((entry) => entry.id === parentId)?.name;
  const trimmed = name.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!trimmed) return;
            onSubmit({
              name: trimmed,
              parentId: parentId === ROOT ? null : parentId,
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {unit ? t("settings:org.editUnit") : t("settings:org.newUnit")}
            </DialogTitle>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="org-unit-name">
                {t("settings:org.unitName")}
              </Label>
              <Input
                id="org-unit-name"
                value={name}
                maxLength={100}
                autoFocus
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("settings:org.parent")}</Label>
              <Select
                value={parentId}
                onValueChange={(value) => {
                  if (typeof value === "string") setParentId(value);
                }}
              >
                <SelectTrigger size="sm" aria-label={t("settings:org.parent")}>
                  <SelectValue>{parentName}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROOT}>
                    {t("settings:org.noParent")}
                  </SelectItem>
                  {parents.map(({ unit: option, depth }) => (
                    <SelectItem key={option.id} value={option.id}>
                      <span style={{ paddingInlineStart: `${depth * 12}px` }}>
                        {option.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogPanel>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              {t("common:actions.cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={!trimmed || pending}>
              {t("settings:org.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
