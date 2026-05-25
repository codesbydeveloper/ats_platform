"use client";

import { SearchableMultiSelect } from "@/components/shared/searchable-multi-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoryFilterField } from "@/lib/category-filter-fields";
import {
  filterSearchPlaceholder,
  usesDropdownFilterControl,
} from "@/lib/category-filter-fields";

interface DynamicFilterFieldProps {
  field: CategoryFilterField;
  value: string[];
  onChange: (values: string[]) => void;
  /** Inline grid (teachers list) vs drawer layout */
  variant?: "grid" | "drawer";
  options?: string[];
}

export function DynamicFilterFieldControl({
  field,
  value,
  onChange,
  variant = "drawer",
  options: optionsProp,
}: DynamicFilterFieldProps) {
  const label = field.label;
  const options = optionsProp ?? field.options;
  const searchPlaceholder = filterSearchPlaceholder(label);

  if (variant === "grid") {
    if (usesDropdownFilterControl(field, options)) {
      return (
        <SearchableMultiSelect
          hideLabel
          label={label}
          options={options}
          selected={value}
          onChange={onChange}
          placeholder={searchPlaceholder}
          searchPlaceholder={`Type to search ${label.toLowerCase()}…`}
        />
      );
    }

    const textVal = value[0] ?? "";
    const inputType =
      field.type === "email"
        ? "email"
        : field.type === "tel"
          ? "tel"
          : field.type === "number"
            ? "number"
            : "text";
    return (
      <Input
        id={`filter-${field.key}`}
        className="h-9 w-full"
        placeholder={searchPlaceholder}
        type={inputType}
        value={textVal}
        onChange={(e) =>
          onChange(e.target.value.trim() ? [e.target.value.trim()] : [])
        }
      />
    );
  }

  if (field.type === "multiselect" && options.length > 0) {
    return (
      <SearchableMultiSelect
        label={label}
        options={options}
        selected={value}
        onChange={onChange}
        searchPlaceholder={`Search ${label.toLowerCase()}…`}
      />
    );
  }

  if (field.type === "boolean") {
    const selected = value[0] ?? "";
    return (
      <div className="space-y-2">
        <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
        <Select
          value={selected || undefined}
          onValueChange={(v) => onChange(v ? [v] : [])}
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder={`Select ${label.toLowerCase()}…`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Yes">Yes</SelectItem>
            <SelectItem value="No">No</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "select" && options.length > 0) {
    const selected = value[0] ?? "";
    return (
      <div className="space-y-2">
        <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
        <Select
          value={selected || undefined}
          onValueChange={(v) => onChange(v ? [v] : [])}
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder={`Select ${label.toLowerCase()}…`} />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  const textVal = value[0] ?? "";
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      <Input
        className="h-10"
        placeholder={`Filter by ${label.toLowerCase()}…`}
        value={textVal}
        onChange={(e) =>
          onChange(e.target.value.trim() ? [e.target.value.trim()] : [])
        }
      />
    </div>
  );
}
