"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface SearchableMultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchPlaceholder?: string;
  /** When true, label is omitted (use parent FormLabel). */
  hideLabel?: boolean;
  /** Override empty-state trigger text (default: "Select {label}…"). */
  placeholder?: string;
}

export function SearchableMultiSelect({
  label,
  options,
  selected,
  onChange,
  searchPlaceholder,
  hideLabel = false,
  placeholder,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => o.toLowerCase().includes(s));
  }, [options, q]);

  const toggle = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((x) => x !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  const summary =
    selected.length === 0
      ? (placeholder ?? `Select ${label.toLowerCase()}…`)
      : selected.length <= 2
        ? selected.join(" · ")
        : `${selected.length} selected`;

  return (
    <div className="space-y-2">
      {hideLabel ? null : (
        <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      )}
      <Popover
        modal={false}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQ("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-10 w-full justify-between font-normal"
          >
            <span className="truncate text-left">{summary}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 sm:w-96" align="start" sideOffset={4}>
          <div className="border-b p-2">
            <Input
              placeholder={
                searchPlaceholder ?? `Search ${label.toLowerCase()}…`
              }
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9"
              autoComplete="off"
            />
          </div>
          {/* Native overflow: Radix ScrollArea inside Sheet often eats wheel events */}
          <div
            className="max-h-52 overflow-y-auto overscroll-y-contain p-1"
            onWheel={(e) => {
              e.stopPropagation();
              const el = e.currentTarget;
              el.scrollTop += e.deltaY;
              e.preventDefault();
            }}
          >
              {filtered.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No matches.
                </p>
              ) : (
                filtered.map((opt) => {
                  const isOn = selected.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                        isOn && "bg-accent/60"
                      )}
                      onClick={() => toggle(opt)}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                          isOn
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40"
                        )}
                        aria-hidden
                      >
                        {isOn ? (
                          <Check className="h-3 w-3" strokeWidth={3} />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1 leading-snug">{opt}</span>
                    </button>
                  );
                })
              )}
          </div>
          {selected.length > 0 ? (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-full text-xs text-muted-foreground"
                onClick={() => onChange([])}
              >
                Clear {label.toLowerCase()}
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
