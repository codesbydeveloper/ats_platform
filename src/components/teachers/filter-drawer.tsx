"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Loader2, RotateCcw } from "lucide-react";

import { SearchableMultiSelect } from "@/components/shared/searchable-multi-select";
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
import {
  buildApiCategoryFilters,
  getTeacherFilterValues,
  patchTeacherFilterValues,
  type ApiCategoryFilterRow,
  type TeacherFilterField,
} from "@/lib/category-filter-options";
import {
  emptyFilters,
  useFilterStore,
  type TeacherFilters,
} from "@/store/filter-store";
import { useAuthStore } from "@/store/auth-store";
import { useTeacherStore } from "@/store/teacher-store";

function uniq(values: string[]) {
  return Array.from(new Set(values));
}

interface FilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilterDrawer({ open, onOpenChange }: FilterDrawerProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const replaceFilters = useFilterStore((s) => s.replaceFilters);
  const resetFilters = useFilterStore((s) => s.resetFilters);
  const teachers = useTeacherStore((s) => s.teachers);

  const [local, setLocal] = useState<TeacherFilters>(() =>
    useFilterStore.getState().filters
  );
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [apiFilters, setApiFilters] = useState<ApiCategoryFilterRow[]>([]);
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
        setApiFilters(buildApiCategoryFilters(result.categories));
        setLoadFailed(false);
        return;
      }

      setApiFilters([]);
      setLoadFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [open, accessToken]);

  const apply = () => {
    replaceFilters(local);
    onOpenChange(false);
  };

  const cityOptions = useMemo(() => {
    const list = new Set<string>();
    teachers.forEach((t) => {
      if (t.city && t.city !== "—") list.add(t.city);
    });
    return uniq([...list]).sort();
  }, [teachers]);

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
                Loading…
              </div>
            ) : loadFailed ? (
              <p className="text-sm text-muted-foreground">
                Could not load categories. Check that the API is running.
              </p>
            ) : apiFilters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No categories yet. Add groups under Categories in the menu,
                then open filters again.
              </p>
            ) : (
              apiFilters
                .filter((row): row is ApiCategoryFilterRow & { field: TeacherFilterField } =>
                  row.field != null
                )
                .map((row) => (
                  <SearchableMultiSelect
                    key={row.categoryId}
                    label={row.label}
                    options={row.options}
                    selected={getTeacherFilterValues(local, row.field)}
                    onChange={(values) =>
                      setLocal((p) =>
                        patchTeacherFilterValues(p, row.field, values)
                      )
                    }
                  />
                ))
            )}
            {cityOptions.length > 0 ? (
              <SearchableMultiSelect
                label="City"
                options={cityOptions}
                selected={local.cities}
                onChange={(cities) => setLocal((p) => ({ ...p, cities }))}
              />
            ) : null}
            <SearchableMultiSelect
              label="Employment status"
              options={["active", "inactive", "pending"]}
              selected={local.status}
              onChange={(status) => setLocal((p) => ({ ...p, status }))}
            />
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
