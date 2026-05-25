"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Loader2, RotateCcw } from "lucide-react";

import { DynamicFilterFieldControl } from "@/components/teachers/dynamic-filter-field";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { listAllCategoriesRequest } from "@/lib/categories-api";
import type { CategoryFilterField } from "@/lib/category-filter-fields";
import {
  emptyFilters,
  useFilterStore,
  type TeacherFilters,
} from "@/store/filter-store";
import { useAuthStore } from "@/store/auth-store";

interface FilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function groupBySection(fields: CategoryFilterField[]) {
  const groups: { title: string; fields: CategoryFilterField[] }[] = [];
  const map = new Map<string, CategoryFilterField[]>();

  for (const field of fields) {
    const title = field.sectionTitle?.trim() || "Filters";
    const list = map.get(title) ?? [];
    list.push(field);
    map.set(title, list);
  }

  for (const [title, list] of map) {
    groups.push({ title, fields: list });
  }
  return groups;
}

export function FilterDrawer({ open, onOpenChange }: FilterDrawerProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const replaceFilters = useFilterStore((s) => s.replaceFilters);
  const resetFilters = useFilterStore((s) => s.resetFilters);

  const [local, setLocal] = useState<TeacherFilters>(() =>
    useFilterStore.getState().filters
  );
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [filterFields, setFilterFields] = useState<CategoryFilterField[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setOptionsLoading(true);
    setLoadFailed(false);

    void listAllCategoriesRequest(accessToken).then((result) => {
      if (cancelled) return;
      setOptionsLoading(false);

      if (result.ok) {
        setFilterFields(result.filterFields);
        setLoadFailed(false);
        return;
      }

      setFilterFields([]);
      setLoadFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [open, accessToken]);

  const grouped = useMemo(() => groupBySection(filterFields), [filterFields]);

  const setDynamic = (key: string, values: string[]) => {
    setLocal((prev) => ({
      ...prev,
      dynamic: { ...prev.dynamic, [key]: values },
    }));
  };

  const apply = () => {
    replaceFilters(local);
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setLocal(useFilterStore.getState().filters);
        }
        onOpenChange(o);
      }}
    >
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Advanced filters
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 pr-3">
          <div className="grid gap-6 py-2">
            {optionsLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading filter fields…
              </div>
            ) : filterFields.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {loadFailed
                  ? "Could not load filters from the API."
                  : "No filter fields enabled. Turn on the filter icon for fields in Form builder."}
              </p>
            ) : (
              grouped.map((group) => (
                <div key={group.title} className="space-y-4">
                  {grouped.length > 1 ? (
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {group.title}
                    </p>
                  ) : null}
                  {group.fields.map((field) => (
                    <DynamicFilterFieldControl
                      key={field.id}
                      field={field}
                      value={local.dynamic[field.key] ?? []}
                      onChange={(values) => setDynamic(field.key, values)}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <SheetFooter className="gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setLocal(emptyFilters());
              resetFilters();
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button type="button" onClick={apply} disabled={optionsLoading}>
            Apply filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
