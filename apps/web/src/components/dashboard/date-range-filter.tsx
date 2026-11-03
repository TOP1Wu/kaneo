import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import type { DashboardRange } from "@/lib/org-scope/scope-query";

type DateRangeFilterProps = {
  value: DashboardRange;
  onChange: (value: DashboardRange) => void;
};

/** Created-date bounds; the API treats a bare `to` date as the whole day. */
export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const { t } = useTranslation();
  const fromId = useId();
  const toId = useId();

  return (
    <fieldset className="flex flex-wrap items-center gap-2 text-sm">
      <legend className="sr-only">
        {t("workspace:dashboard.range.label")}
      </legend>
      <label htmlFor={fromId} className="text-muted-foreground text-xs">
        {t("workspace:dashboard.range.from")}
      </label>
      <Input
        id={fromId}
        type="date"
        size="sm"
        className="w-38"
        value={value.from ?? ""}
        max={value.to}
        onChange={(event) =>
          onChange({ ...value, from: event.target.value || undefined })
        }
      />
      <label htmlFor={toId} className="text-muted-foreground text-xs">
        {t("workspace:dashboard.range.to")}
      </label>
      <Input
        id={toId}
        type="date"
        size="sm"
        className="w-38"
        value={value.to ?? ""}
        min={value.from}
        onChange={(event) =>
          onChange({ ...value, to: event.target.value || undefined })
        }
      />
    </fieldset>
  );
}
