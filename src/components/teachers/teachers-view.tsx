"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { RowSelectionState } from "@tanstack/react-table";
import * as XLSX from "xlsx";
import {
  Download,
  Filter,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { TeacherAdvancedSearchPanel } from "@/components/teachers/teacher-advanced-search-panel";
import { ImportExcelModal } from "@/components/teachers/import-excel-modal";
import { teacherToFormValues } from "@/components/teachers/teacher-form-drawer";
import { TeacherTable } from "@/components/teachers/teacher-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { teacherFiltersAreEmpty } from "@/lib/teacher-list-search-params";
import { filterTeachers } from "@/utils/filter-teachers";
import {
  exportTeachersCsv,
  exportTeachersXlsx,
  appendTeacherLookupSheets,
} from "@/utils/export-teachers";
import { useAuthStore } from "@/store/auth-store";
import { listAllCategoriesRequest } from "@/lib/categories-api";
import { fetchTeacherFormOptions } from "@/lib/teacher-form-options";
import { useFilterStore } from "@/store/filter-store";
import {
  bulkDeleteTeachersRequest,
  deleteTeacherRequest,
  exportTeachersFromApi,
  exportTeachersFileFromApi,
  listTeachersRequest,
  updateTeacherRequest,
} from "@/lib/teachers-api";
import { openTeacherResumeInNewTab } from "@/lib/teacher-resume";
import { useTeacherStore } from "@/store/teacher-store";
import { useUiStore } from "@/store/ui-store";
import {
  TEACHERS_DEFAULT_PAGE_SIZE,
  TEACHERS_PAGE_SIZE_OPTIONS,
} from "@/config/teachers-list";
import type { Teacher, TeacherStatus } from "@/types/teacher";

function FilterChips({ onSearch }: { onSearch: () => void }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const appliedFilters = useFilterStore((s) => s.appliedFilters);
  const resetFilters = useFilterStore((s) => s.resetFilters);
  const [labelByKey, setLabelByKey] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    void listAllCategoriesRequest(accessToken).then((result) => {
      if (cancelled || !result.ok) return;
      const map: Record<string, string> = {};
      for (const field of result.filterFields) {
        map[field.key] = field.label;
      }
      setLabelByKey(map);
    });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (appliedFilters.search.trim()) {
    chips.push({
      key: "q-global",
      label: `Search: ${appliedFilters.search.trim()}`,
      onRemove: () => {
        const current = useFilterStore.getState().appliedFilters;
        const next = { ...current, search: "" };
        useFilterStore.getState().replaceFilters(next);
        onSearch();
      },
    });
  }

  for (const [fieldKey, values] of Object.entries(appliedFilters.dynamic)) {
    const prefix = labelByKey[fieldKey] ?? fieldKey;
    values.forEach((v) => {
      chips.push({
        key: `${fieldKey}-${v}`,
        label: `${prefix}: ${v}`,
        onRemove: () => {
          const current = useFilterStore.getState().appliedFilters;
          const nextList = (current.dynamic[fieldKey] ?? []).filter(
            (x) => x !== v
          );
          const dynamic = { ...current.dynamic, [fieldKey]: nextList };
          if (!nextList.length) delete dynamic[fieldKey];
          useFilterStore.getState().replaceFilters({
            ...current,
            dynamic,
          });
          onSearch();
        },
      });
    });
  }

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <Badge
          key={c.key}
          variant="secondary"
          className="cursor-pointer gap-1 pr-1"
          onClick={c.onRemove}
        >
          {c.label}
          <span className="text-muted-foreground">×</span>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          resetFilters();
          onSearch();
        }}
      >
        Clear all
      </Button>
    </div>
  );
}

export function TeachersView() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const teachers = useTeacherStore((s) => s.teachers);
  const updateTeacher = useTeacherStore((s) => s.updateTeacher);
  const deleteTeacher = useTeacherStore((s) => s.deleteTeacher);
  const bulkDelete = useTeacherStore((s) => s.bulkDelete);
  const appliedFilters = useFilterStore((s) => s.appliedFilters);
  const compactDensity = useUiStore((s) => s.compactDensity);

  const useApiList = Boolean(accessToken);

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [importOpen, setImportOpen] = useState(false);
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [resumeOpenId, setResumeOpenId] = useState<string | null>(null);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(TEACHERS_DEFAULT_PAGE_SIZE);
  const [fetchKey, setFetchKey] = useState(0);
  const [apiTeachers, setApiTeachers] = useState<Teacher[]>([]);
  const [apiTotal, setApiTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setApiTeachers([]);
      setApiTotal(0);
      setListError(null);
      setPageIndex(0);
      setPageSize(TEACHERS_DEFAULT_PAGE_SIZE);
    }
  }, [accessToken]);

  const appliedFilterQueryKey = useMemo(
    () =>
      JSON.stringify({
        search: appliedFilters.search,
        dynamic: appliedFilters.dynamic,
      }),
    [appliedFilters.search, appliedFilters.dynamic]
  );

  const hasActiveFilters = useMemo(
    () => !teacherFiltersAreEmpty(appliedFilters),
    [appliedFilters]
  );

  const handleSearchSubmit = useCallback(() => {
    setPageIndex(0);
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setListLoading(true);
    setListError(null);
    void (async () => {
      const res = await listTeachersRequest(
        accessToken,
        pageIndex + 1,
        pageSize,
        appliedFilters
      );
      if (cancelled) return;
      setListLoading(false);
      if (!res.ok) {
        setListError(res.message);
        setApiTeachers([]);
        setApiTotal(0);
        return;
      }
      setApiTeachers(res.teachers);
      setApiTotal(res.total);
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, pageIndex, pageSize, fetchKey, appliedFilterQueryKey]);

  useEffect(() => {
    setRowSelection({});
  }, [pageIndex]);

  const refetchTeachers = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  const handleStatusToggle = useCallback(
    (t: Teacher) => {
      const next: TeacherStatus =
        t.status === "active" ? "inactive" : "active";
      void (async () => {
        if (!accessToken) {
          updateTeacher(t.id, { status: next });
          toast.success("Status updated", {
            description: `${t.name} is now ${next}.`,
          });
          return;
        }
        setStatusBusyId(t.id);
        const values = { ...teacherToFormValues(t), status: next };
        const result = await updateTeacherRequest(
          accessToken,
          t.id,
          values,
          null
        );
        setStatusBusyId(null);
        if (!result.ok) {
          toast.error("Could not update status", {
            description: result.message,
          });
          return;
        }
        updateTeacher(t.id, { status: next });
        refetchTeachers();
        toast.success("Status updated", {
          description: `${t.name} is now ${next}.`,
        });
      })();
    },
    [accessToken, updateTeacher, refetchTeachers]
  );

  /** API list is filtered server-side; local store uses client-side filters. */
  const tableRows = useMemo(() => {
    if (useApiList) return apiTeachers;
    return filterTeachers(teachers, appliedFilters);
  }, [useApiList, apiTeachers, teachers, appliedFilters]);

  const selectedRows = useMemo(() => {
    const ids = Object.keys(rowSelection).filter((id) => rowSelection[id]);
    return tableRows.filter((t) => ids.includes(t.id));
  }, [tableRows, rowSelection]);

  const exportName = () =>
    `teachers-export-${new Date().toISOString().slice(0, 10)}`;

  const sanitizeExportWorkbookContactIds = (book: XLSX.WorkBook) => {
    const sheetName = book.Sheets.Teachers ? "Teachers" : book.SheetNames[0];
    if (!sheetName) return;
    const sheet = book.Sheets[sheetName];
    if (!sheet || !sheet["!ref"]) return;
    const range = XLSX.utils.decode_range(sheet["!ref"]);

    const norm = (v: unknown) =>
      String(v ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

    let headerRow = range.s.r;
    let contactCol: number | null = null;

    // Find "CONTACT ID" header within first few rows.
    for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 4); r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[addr];
        if (!cell) continue;
        if (norm(cell.v) === "contact id") {
          headerRow = r;
          contactCol = c;
          break;
        }
      }
      if (contactCol != null) break;
    }

    if (contactCol == null) return;

    for (let r = headerRow + 1; r <= range.e.r; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: contactCol });
      const cell = sheet[addr];
      if (!cell || cell.v == null) continue;
      const v = String(cell.v).trim();
      if (!v) continue;
      const next = v.replace(/^tch[-\s]*/i, "");
      if (next !== v) {
        cell.v = next;
        delete (cell as { w?: string }).w;
      }
    }
  };

  const handleExport = useCallback(
    async (
      scope: "all" | "filtered" | "selected",
      format: "xlsx" | "csv"
    ) => {
      if (accessToken) {
        // Decorate XLSX exports with the same lookup sheets as the import template.
        if (format === "xlsx") {
          if (scope === "selected") {
            const ids = selectedRows.map((t) => t.id);
            if (!ids.length) {
              toast.error("Select at least one row");
              return;
            }
            const result = await exportTeachersFileFromApi(accessToken, {
              scope,
              format,
              selectedIds: ids,
            });
            if (!result.ok) {
              toast.error("Export failed", { description: result.message });
              return;
            }
            const options = await fetchTeacherFormOptions(accessToken);
            const buf = await result.blob.arrayBuffer();
            const book = XLSX.read(new Uint8Array(buf), { type: "array" });
            appendTeacherLookupSheets(book, options);
            sanitizeExportWorkbookContactIds(book);
            XLSX.writeFile(book, result.filename);
            toast.success("Export complete", { description: result.filename });
            return;
          }

          const result = await exportTeachersFileFromApi(accessToken, {
            scope,
            format,
            filters: scope === "filtered" ? appliedFilters : undefined,
          });
          if (!result.ok) {
            toast.error("Export failed", { description: result.message });
            return;
          }
          const options = await fetchTeacherFormOptions(accessToken);
          const buf = await result.blob.arrayBuffer();
          const book = XLSX.read(new Uint8Array(buf), { type: "array" });
          appendTeacherLookupSheets(book, options);
          sanitizeExportWorkbookContactIds(book);
          XLSX.writeFile(book, result.filename);
          toast.success("Export complete", { description: result.filename });
          return;
        }

        if (scope === "selected") {
          const ids = selectedRows.map((t) => t.id);
          if (!ids.length) {
            toast.error("Select at least one row");
            return;
          }
          const result = await exportTeachersFromApi(accessToken, {
            scope,
            format,
            selectedIds: ids,
          });
          if (!result.ok) {
            toast.error("Export failed", { description: result.message });
            return;
          }
          toast.success("Export complete", {
            description: result.filename,
          });
          return;
        }

        const result = await exportTeachersFromApi(accessToken, {
          scope,
          format,
          filters: scope === "filtered" ? appliedFilters : undefined,
        });
        if (!result.ok) {
          toast.error("Export failed", { description: result.message });
          return;
        }
        toast.success("Export complete", {
          description: result.filename,
        });
        return;
      }

      let data: Teacher[] = teachers;
      if (scope === "filtered") data = tableRows;
      if (scope === "selected") {
        const ids = new Set(selectedRows.map((t) => t.id));
        data = tableRows.filter((t) => ids.has(t.id));
        if (!data.length) {
          toast.error("Select at least one row");
          return;
        }
      }
      if (format === "xlsx") {
        const options = await fetchTeacherFormOptions(accessToken);
        exportTeachersXlsx(data, exportName(), options);
      }
      else exportTeachersCsv(data, exportName());
      toast.success("Export started", {
        description: `${data.length} record(s) · ${format.toUpperCase()}`,
      });
    },
    [accessToken, selectedRows, appliedFilters, teachers, tableRows]
  );

  const openAdd = () => {
    router.push("/teachers/new");
  };

  const openEdit = (t: Teacher) => {
    router.push(`/teachers/${encodeURIComponent(t.id)}/edit`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teachers"
        description={
          useApiList
            ? ""
            : "Search, filter, and manage your talent pool with ATS-grade tooling."
        }
      />

      {listError && useApiList ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{listError}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-destructive/40"
            onClick={() => {
              setListError(null);
              refetchTeachers();
            }}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {advancedSearchOpen ? (
        <TeacherAdvancedSearchPanel
          open={advancedSearchOpen}
          onSearch={handleSearchSubmit}
          searching={listLoading}
        />
      ) : null}

      <div className="sticky top-14 z-30 -mx-4 border-b bg-background/90 px-4 py-3 backdrop-blur md:top-16 md:-mx-8 md:px-8">
        <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-1 h-4 w-4" />
              Add teacher
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="mr-1 h-4 w-4" />
              Import Excel
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Download className="mr-1 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuLabel>Spreadsheet</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => void handleExport("all", "xlsx")}
                >
                  All · XLSX
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void handleExport("all", "csv")}
                >
                  All · CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => void handleExport("filtered", "xlsx")}
                >
                  Filtered · XLSX
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void handleExport("filtered", "csv")}
                >
                  Filtered · CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => void handleExport("selected", "xlsx")}
                >
                  Selected · XLSX
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void handleExport("selected", "csv")}
                >
                  Selected · CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              variant={advancedSearchOpen ? "default" : "secondary"}
              onClick={() => setAdvancedSearchOpen((open) => !open)}
              aria-expanded={advancedSearchOpen}
            >
              <Filter className="mr-1 h-4 w-4" />
              Advanced search
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  Bulk actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setBulkConfirm(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete selected
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void handleExport("selected", "xlsx")}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
        <Separator className="my-3" />
        <FilterChips onSearch={handleSearchSubmit} />
      </div>

      {useApiList && listLoading ? (
        <TableSkeleton rows={Math.min(pageSize, 12)} />
      ) : useApiList && listError ? (
        <p className="px-1 text-sm text-muted-foreground">
          Could not load this page. Fix the issue above and retry.
        </p>
      ) : useApiList &&
          !listError &&
          tableRows.length === 0 &&
          apiTotal === 0 &&
          !hasActiveFilters ? (
        <EmptyState
          icon={Upload}
          title="No teachers yet"
          description="Create a teacher or check your API. Signed-in users load data from the server."
          actionLabel="Add teacher"
          onAction={openAdd}
        />
      ) : useApiList &&
          !listError &&
          tableRows.length === 0 &&
          hasActiveFilters ? (
        <EmptyState
          icon={Filter}
          title="No teachers match your search"
          description="Clear advanced search filters to see all teachers from the server."
          actionLabel="Reset search"
          onAction={() => {
            useFilterStore.getState().resetFilters();
            handleSearchSubmit();
          }}
        />
      ) : !useApiList && tableRows.length === 0 ? (
        <EmptyState
          icon={Upload}
          title="No teachers match"
          description="Adjust filters or import a spreadsheet to grow your roster."
          actionLabel="Reset filters"
          onAction={() => {
            useFilterStore.getState().resetFilters();
            handleSearchSubmit();
          }}
        />
      ) : (
        <TeacherTable
          data={tableRows}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          compact={compactDensity}
          statusBusyId={statusBusyId}
          onStatusToggle={handleStatusToggle}
          serverPagination={
            useApiList
              ? {
                  pageIndex,
                  pageSize,
                  pageCount: Math.max(1, Math.ceil(apiTotal / pageSize)),
                  totalCount: apiTotal,
                  pageSizeOptions: TEACHERS_PAGE_SIZE_OPTIONS,
                  onPageChange: (idx) => setPageIndex(idx),
                  onPageSizeChange: (size) => {
                    setPageSize(size);
                    setPageIndex(0);
                  },
                }
              : undefined
          }
          onView={(t) => router.push(`/teachers/${t.id}`)}
          onEdit={openEdit}
          onDelete={(t) => setDeleteTarget(t)}
          onOpenResume={(t) => {
            void (async () => {
              setResumeOpenId(t.id);
              const result = await openTeacherResumeInNewTab(accessToken, t);
              setResumeOpenId(null);
              if (!result.ok) {
                toast.error("Could not open resume", {
                  description: result.message,
                });
              }
            })();
          }}
          resumeOpenBusyId={resumeOpenId}
        />
      )}

      <ImportExcelModal
        open={importOpen}
        onOpenChange={setImportOpen}
        teachers={teachers}
        onAfterApiImport={() => {
          setPageIndex(0);
          refetchTeachers();
        }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Delete teacher?"
        description={
          accessToken
            ? "This removes the teacher on the server and from your workspace."
            : "This removes the profile from your local workspace."
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          const target = deleteTarget;
          if (!target) return;
          void (async () => {
            if (accessToken) {
              const result = await deleteTeacherRequest(
                accessToken,
                target.id
              );
              if (!result.ok) {
                toast.error("Could not delete teacher", {
                  description: result.message,
                });
                return;
              }
            }
            deleteTeacher(target.id);
            if (accessToken) refetchTeachers();
            toast.success("Teacher removed");
          })();
        }}
      />
      <ConfirmDialog
        open={bulkConfirm}
        onOpenChange={setBulkConfirm}
        title="Delete selected teachers?"
        description={
          accessToken
            ? "Selected teachers will be removed on the server and cleared from this page."
            : "Selected rows will be removed from local storage."
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          const ids = selectedRows.map((t) => t.id);
          if (!ids.length) return;
          void (async () => {
            if (accessToken) {
              const result = await bulkDeleteTeachersRequest(
                accessToken,
                ids
              );
              if (!result.ok) {
                toast.error("Could not delete teachers", {
                  description: result.message,
                });
                return;
              }
            }
            bulkDelete(ids);
            setRowSelection({});
            if (accessToken) refetchTeachers();
            toast.success("Bulk delete complete");
          })();
        }}
      />
    </div>
  );
}
