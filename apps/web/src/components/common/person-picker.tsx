import type { ReactNode } from "react";
import { OptionMenu } from "@/components/common/option-menu/option-menu";
import type { OptionMenuItem } from "@/components/common/option-menu/option-menu-item";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type PersonPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Names the search field for screen readers. */
  label: string;
  placeholder: string;
  options: OptionMenuItem[];
  onSelect: (value: string) => void;
  modal?: boolean;
  children: ReactNode;
};

/** One picker shell for the assignee chip and a task member's seat. */
export function PersonPicker({
  open,
  onOpenChange,
  label,
  placeholder,
  options,
  onSelect,
  modal,
  children,
}: PersonPickerProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange} modal={modal}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <OptionMenu
          label={label}
          placeholder={placeholder}
          options={options}
          onSelect={onSelect}
        />
      </PopoverContent>
    </Popover>
  );
}
