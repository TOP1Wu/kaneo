import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuCheckboxItem,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { cn } from "@/lib/cn";

export type FilterOption = { value: string; label: string };

type MultiSelectFilterProps = {
  label: string;
  options: readonly FilterOption[];
  value: readonly string[];
  onChange: (value: string[]) => void;
};

export function MultiSelectFilter({
  label,
  options,
  value,
  onChange,
}: MultiSelectFilterProps) {
  const { t } = useTranslation();
  const selected = new Set(value);
  const summary =
    value.length === 0
      ? label
      : value.length === 1
        ? `${label}: ${options.find((option) => option.value === value[0])?.label ?? value[0]}`
        : `${label}: ${value.length}`;

  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(value.length > 0 && "border-primary/40 bg-primary/5")}
          />
        }
      >
        <span className="max-w-44 truncate">{summary}</span>
        <ChevronDown aria-hidden="true" className="opacity-60" />
      </MenuTrigger>
      <MenuPopup align="start" className="max-h-80">
        {options.map((option) => (
          <MenuCheckboxItem
            key={option.value}
            checked={selected.has(option.value)}
            onCheckedChange={(checked) =>
              onChange(
                checked
                  ? [...value, option.value]
                  : value.filter((entry) => entry !== option.value),
              )
            }
          >
            {option.label}
          </MenuCheckboxItem>
        ))}
        {value.length > 0 && (
          <>
            <MenuSeparator />
            <MenuItem closeOnClick onClick={() => onChange([])}>
              {t("common:actions.clearAll")}
            </MenuItem>
          </>
        )}
      </MenuPopup>
    </Menu>
  );
}
