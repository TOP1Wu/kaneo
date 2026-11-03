import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrgUnit } from "@/fetchers/org-unit/get-org-units";
import { cn } from "@/lib/cn";
import type { ScopeOptions } from "@/lib/org-scope/scope-options";
import type { ScopeName, ScopeSelection } from "@/lib/org-scope/scope-query";

type ScopeSwitcherProps = {
  options: ScopeOptions;
  units: readonly OrgUnit[];
  value: ScopeSelection;
  onChange: (value: ScopeSelection) => void;
};

export function ScopeSwitcher({
  options,
  units,
  value,
  onChange,
}: ScopeSwitcherProps) {
  const { t } = useTranslation();
  const labels: Record<ScopeName, string> = {
    mine: t("workspace:orgViews.scope.mine"),
    unit: t("workspace:orgViews.scope.unit"),
    all: t("workspace:orgViews.scope.all"),
  };
  const unitOptions = units.filter((unit) => options.unitIds.includes(unit.id));
  const unitName = unitOptions.find((unit) => unit.id === value.unitId)?.name;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <fieldset className="inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5">
        <legend className="sr-only">
          {t("workspace:orgViews.scope.label")}
        </legend>
        {options.scopes.map((scope) => (
          <Button
            key={scope}
            type="button"
            size="xs"
            variant={value.scope === scope ? "secondary" : "ghost"}
            aria-pressed={value.scope === scope}
            className={cn(value.scope !== scope && "text-muted-foreground")}
            onClick={() =>
              onChange(
                scope === "unit"
                  ? { scope, unitId: value.unitId ?? options.unitIds[0] }
                  : { scope },
              )
            }
          >
            {labels[scope]}
          </Button>
        ))}
      </fieldset>
      {value.scope === "unit" && unitOptions.length > 0 && (
        <Select
          value={value.unitId ?? null}
          onValueChange={(unitId) => {
            if (typeof unitId === "string") onChange({ scope: "unit", unitId });
          }}
        >
          <SelectTrigger
            size="sm"
            className="w-44"
            aria-label={t("workspace:orgViews.scope.pickUnit")}
          >
            <SelectValue>{unitName}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {unitOptions.map((unit) => (
              <SelectItem key={unit.id} value={unit.id}>
                {unit.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
