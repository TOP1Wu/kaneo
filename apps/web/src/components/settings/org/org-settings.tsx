import { Network, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { SettingsCard } from "@/components/settings/settings-card";
import { SettingsEmpty } from "@/components/settings/settings-empty";
import { SettingsPage } from "@/components/settings/settings-page";
import { SettingsRowsSkeleton } from "@/components/settings/settings-rows-skeleton";
import { Button } from "@/components/ui/button";
import type { OrgUnit } from "@/fetchers/org-unit/get-org-units";
import {
  useCreateOrgUnit,
  useDeleteOrgUnit,
  useReplaceOrgUnitMembers,
  useUpdateOrgUnit,
} from "@/hooks/mutations/org-unit/use-org-unit-mutations";
import useGetOrgUnits from "@/hooks/queries/org-unit/use-get-org-units";
import useGetWorkspaceMembers from "@/hooks/queries/workspace-users/use-get-workspace-members";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { cn } from "@/lib/cn";
import { HttpError } from "@/lib/http-error";
import { toast } from "@/lib/toast";
import { OrgMembersPanel } from "./org-members-panel";
import { flattenOrgTree } from "./org-tree";
import { type OrgUnitDraft, OrgUnitDialog } from "./org-unit-dialog";

type DialogState = { unit: OrgUnit | null; parentId: string | null } | null;

export function OrgSettings() {
  const { t } = useTranslation();
  const { workspace, canManageSettings, isCheckingPermissions } =
    useWorkspacePermission();
  const workspaceId = workspace?.id ?? "";
  const canManage = canManageSettings();
  const unitsQuery = useGetOrgUnits(workspaceId);
  const { data: people = [] } = useGetWorkspaceMembers(workspaceId);
  const createUnit = useCreateOrgUnit(workspaceId);
  const updateUnit = useUpdateOrgUnit(workspaceId);
  const deleteUnit = useDeleteOrgUnit(workspaceId);
  const replaceMembers = useReplaceOrgUnitMembers(workspaceId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deleting, setDeleting] = useState<OrgUnit | null>(null);

  const units = unitsQuery.data?.units ?? [];
  const rows = flattenOrgTree(units);
  const selected =
    units.find((unit) => unit.id === selectedId) ?? rows[0]?.unit ?? null;

  // The two expected refusals get translated copy; others keep the API text.
  const fail = (error: unknown) => {
    if (error instanceof HttpError && error.status === 409)
      return toast.error(t("settings:org.deleteHasChildren"));
    if (error instanceof HttpError && error.status === 400 && dialog?.unit)
      return toast.error(t("settings:org.moveIntoSelf"));
    toast.error(
      error instanceof Error ? error.message : t("settings:org.saveError"),
    );
  };

  const submit = (draft: OrgUnitDraft) => {
    const onSuccess = () => setDialog(null);
    if (dialog?.unit) {
      updateUnit.mutate(
        { id: dialog.unit.id, body: draft },
        { onSuccess, onError: fail },
      );
    } else {
      createUnit.mutate(draft, {
        onSuccess: (created) => {
          setSelectedId(created.id);
          onSuccess();
        },
        onError: fail,
      });
    }
  };

  const newUnitButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setDialog({ unit: null, parentId: selected?.id ?? null })}
    >
      <Plus aria-hidden="true" />
      {t("settings:org.newUnit")}
    </Button>
  );

  if (!isCheckingPermissions && !canManage) {
    return (
      <SettingsPage title={t("settings:org.title")}>
        <p role="alert" className="text-muted-foreground text-sm">
          {t("settings:org.adminOnly")}
        </p>
      </SettingsPage>
    );
  }

  const renderTree = () => {
    if (unitsQuery.isPending) return <SettingsRowsSkeleton />;
    if (unitsQuery.isError)
      return (
        <p
          role="alert"
          className="px-4 py-3.5 text-destructive-foreground text-sm"
        >
          {t("settings:org.loadError")}
        </p>
      );
    if (rows.length === 0)
      return (
        <SettingsEmpty
          icon={<Network />}
          title={t("settings:org.emptyTitle")}
          description={t("settings:org.emptyDescription")}
          action={newUnitButton}
        />
      );
    return (
      <ul
        aria-label={t("settings:org.treeLabel")}
        className="flex flex-col py-1"
      >
        {rows.map(({ unit, depth }) => {
          const isSelected = unit.id === selected?.id;
          return (
            <li
              key={unit.id}
              className={cn(
                "group flex h-9 items-center gap-1 pr-1",
                isSelected && "bg-accent",
              )}
            >
              <button
                type="button"
                aria-current={isSelected ? "true" : undefined}
                className="flex h-full min-w-0 flex-1 items-center gap-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ paddingInlineStart: `${16 + depth * 16}px` }}
                onClick={() => setSelectedId(unit.id)}
              >
                <span className="truncate">{unit.name}</span>
                <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                  {unit.members.length}
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("settings:org.editUnitNamed", {
                  name: unit.name,
                })}
                onClick={() => setDialog({ unit, parentId: unit.parentId })}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("settings:org.deleteUnitNamed", {
                  name: unit.name,
                })}
                onClick={() => setDeleting(unit)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <>
      <SettingsPage
        className="max-w-5xl"
        title={t("settings:org.title")}
        description={t("settings:org.subtitle")}
        actions={rows.length > 0 ? newUnitButton : null}
      >
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <SettingsCard>{renderTree()}</SettingsCard>
          <SettingsCard>
            {selected ? (
              <OrgMembersPanel
                unit={selected}
                people={people}
                pending={replaceMembers.isPending}
                onChange={(members) =>
                  replaceMembers.mutate(
                    { id: selected.id, members },
                    { onError: fail },
                  )
                }
              />
            ) : (
              <p className="px-4 py-3.5 text-muted-foreground text-sm">
                {t("settings:org.selectUnit")}
              </p>
            )}
          </SettingsCard>
        </div>
      </SettingsPage>

      <OrgUnitDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        units={units}
        unit={dialog?.unit ?? null}
        defaultParentId={dialog?.parentId ?? null}
        pending={createUnit.isPending || updateUnit.isPending}
        onSubmit={submit}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t("settings:org.deleteTitle", { name: deleting?.name ?? "" })}
        description={t("settings:org.deleteDescription")}
        confirmLabel={t("common:actions.delete")}
        pending={deleteUnit.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteUnit.mutate(deleting.id, {
            onSuccess: () => setDeleting(null),
            onError: fail,
          });
        }}
      />
    </>
  );
}
