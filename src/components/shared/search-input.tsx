"use client";

import type { ComponentProps } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps
  extends Omit<ComponentProps<typeof Input>, "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Pill style for the top app header bar. */
  variant?: "default" | "header";
}

export function SearchInput({
  value,
  onValueChange,
  placeholder = "Search…",
  className,
  variant = "default",
  ...props
}: SearchInputProps) {
  const isHeader = variant === "header";

  return (
    <div className={cn("relative w-full", className)}>
      <Search
        className={cn(
          "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
          isHeader ? "left-4" : "left-3"
        )}
      />
      <Input
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          isHeader
            ? "h-10 rounded-full border-0 bg-[#f0fdf4] pl-11 pr-4 text-sm shadow-none placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary/30 md:h-11"
            : "h-9 pl-9"
        )}
        {...props}
      />
    </div>
  );
}
