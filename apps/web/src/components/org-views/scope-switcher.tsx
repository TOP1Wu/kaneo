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

/**
 * "Me & reports" and "Everyone" are plain toggles; departments are picked by
 * name from a dropdown (the units /my-scope allows), never a bare "Department"
 * option. Picking a department switches to scope=unit.
 */
export function ScopeSwitcher({
  options,
  units,
  value,
  onChange,
}: ScopeSwitcherProps) {
  const { t } = useTranslation();
  const labels: Record<Exclude<ScopeName, "unit">, string> = {
    mine: t("workspace:orgViews.scope.mine"),
    all: t("workspace:orgViews.scope.all"),
  };
  const toggles = options.scopes.filter(
    (scope): scope is Exclude<ScopeName, "unit"> => scope !== "unit",
  );
  const unitOptions = units.filter((unit) => options.unitIds.includes(unit.id));
  const pickedUnit =
    value.scope === "unit"
      ? unitOptions.find((unit) => unit.id === value.unitId)
      : undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <fieldset className="inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5">
        <legend className="sr-only">
          {t("workspace:orgViews.scope.label")}
        </legend>
        {toggles.map((scope) => (
          <Button
            key={scope}
            type="button"
            size="xs"
            variant={value.scope === scope ? "secondary" : "ghost"}
            aria-pressed={value.scope === scope}
            className={cn(value.scope !== scope && "text-muted-foreground")}
            onClick={() => onChange({ scope })}
          >
            {labels[scope]}
          </Button>
        ))}
      </fieldset>
      {options.scopes.includes("unit") && unitOptions.length > 0 && (
        <Select
          value={pickedUnit?.id ?? null}
          onValueChange={(unitId) => {
            if (typeof unitId === "string") onChange({ scope: "unit", unitId });
          }}
        >
          <SelectTrigger
            size="sm"
            className={cn(
              "w-44",
              pickedUnit && "border-ring/60 bg-secondary font-medium",
            )}
            aria-label={t("workspace:orgViews.scope.pickUnit")}
          >
            <SelectValue placeholder={t("workspace:orgViews.scope.pickUnit")}>
              {pickedUnit?.name}
            </SelectValue>
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
