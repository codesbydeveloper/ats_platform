"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw, Search } from "lucide-react";

import { DynamicFilterFieldControl } from "@/components/teachers/dynamic-filter-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listAllCategoriesRequest } from "@/lib/categories-api";
import type { CategoryFilterField } from "@/lib/category-filter-fields";
import {
  mergeAdvancedSearchFilterFields,
  resolveFilterFieldOptions,
} from "@/lib/category-filter-fields";
import { DEFAULT_COUNTRY_NAME } from "@/lib/locations";
import { useAuthStore } from "@/store/auth-store";
import { useFilterStore } from "@/store/filter-store";

interface TeacherAdvancedSearchPanelProps {
  open: boolean;
  onSearch: () => void;
  searching?: boolean;
}

export function TeacherAdvancedSearchPanel({
  open,
  onSearch,
  searching,
}: TeacherAdvancedSearchPanelProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const filters = useFilterStore((s) => s.filters);
  const setFilters = useFilterStore((s) => s.setFilters);
  const setDynamicFilter = useFilterStore((s) => s.setDynamicFilter);
  const resetFilters = useFilterStore((s) => s.resetFilters);
  const applyFilters = useFilterStore((s) => s.applyFilters);

  const [fields, setFields] = useState<CategoryFilterField[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);

    void listAllCategoriesRequest(accessToken).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setFields([]);
        setLoadFailed(true);
        return;
      }
      setFields(result.filterFields);
      setHasLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [open, accessToken]);

  if (!open) return null;

  const country =
    filters.dynamic.country?.[0]?.trim() || DEFAULT_COUNTRY_NAME;
  const state = filters.dynamic.state?.[0]?.trim() ?? "";

  const optionContext = useMemo(
    () => ({ country, state }),
    [country, state]
  );

  const orderedFields = useMemo(
    () => mergeAdvancedSearchFilterFields(fields),
    [fields]
  );

  const handleChange = (field: CategoryFilterField, values: string[]) => {
    setDynamicFilter(field.key, values);
    if (field.key === "state") {
      setDynamicFilter("city", []);
    }
    if (field.key === "country") {
      setDynamicFilter("state", []);
      setDynamicFilter("city", []);
    }
  };

  const runSearch = () => {
    applyFilters();
    onSearch();
  };

  const runReset = () => {
    resetFilters();
    onSearch();
  };

  if (loading || (!hasLoaded && fields.length === 0)) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border bg-card px-4 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading search filters…
      </div>
    );
  }

  if (!fields.length) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
        {loadFailed
          ? "Could not load filters from the API."
          : "No search filters enabled. Turn on the filter toggle for fields in Form builder."}
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-4 max-w-md">
        <Input
          className="h-9 w-full"
          placeholder="Global search (q)"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {orderedFields.map((field) => {
          const options = resolveFilterFieldOptions(field, optionContext);
          const value = filters.dynamic[field.key] ?? [];

          return (
            <div key={field.id} className="min-w-0">
              <DynamicFilterFieldControl
                variant="grid"
                field={field}
                value={value}
                options={options}
                onChange={(next) => handleChange(field, next)}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={searching}
          onClick={runReset}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset search
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={searching}
          onClick={runSearch}
        >
          {searching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          Search
        </Button>
      </div>
    </div>
  );
}
