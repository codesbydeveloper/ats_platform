"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { RowSelectionState } from "@tanstack/react-table";
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
import { FilterDrawer } from "@/components/teachers/filter-drawer";
import { ImportExcelModal } from "@/components/teachers/import-excel-modal";
import {
  TeacherFormDrawer,
  teacherToFormValues,
} from "@/components/teachers/teacher-form-drawer";
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
import { filterTeachers } from "@/utils/filter-teachers";
import {
  exportTeachersCsv,
  exportTeachersXlsx,
} from "@/utils/export-teachers";
import { useAuthStore } from "@/store/auth-store";
import { useFilterStore } from "@/store/filter-store";
import {
  bulkDeleteTeachersRequest,
  deleteTeacherRequest,
  downloadTeacherResumeRequest,
  exportTeachersFromApi,
  listTeachersRequest,
  updateTeacherRequest,
} from "@/lib/teachers-api";
import { useTeacherStore } from "@/store/teacher-store";
import { useUiStore } from "@/store/ui-store";
import {
  TEACHERS_DEFAULT_PAGE_SIZE,
  TEACHERS_PAGE_SIZE_OPTIONS,
} from "@/config/teachers-list";
import type { Teacher, TeacherStatus } from "@/types/teacher";

function FilterChips() {
  const filters = useFilterStore((s) => s.filters);
  const resetFilters = useFilterStore((s) => s.resetFilters);

  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  const pushList = (
    values: string[],
    prefix: string,
    key:
      | "subjects"
      | "roles"
      | "grades"
      | "boards"
      | "cities"
      | "states"
      | "experience"
      | "status"
      | "skills"
  ) => {
    values.forEach((v) => {
      chips.push({
        key: `${key}-${v}`,
        label: `${prefix}: ${v}`,
        onRemove: () => {
          const current = useFilterStore.getState().filters;
          const nextList = (current[key] as string[]).filter((x) => x !== v);
          useFilterStore.getState().replaceFilters({
            ...current,
            [key]: nextList,
          });
        },
      });
    });
  };

  pushList(filters.subjects, "Subject", "subjects");
  pushList(filters.roles, "Role", "roles");
  pushList(filters.grades, "Grade", "grades");
  pushList(filters.boards, "Board", "boards");
  pushList(filters.cities, "City", "cities");
  pushList(filters.states, "State", "states");
  pushList(filters.experience, "Exp", "experience");
  pushList(filters.status, "Status", "status");
  pushList(filters.skills, "Skill", "skills");

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
      <Button variant="ghost" size="sm" onClick={() => resetFilters()}>
        Clear all
      </Button>
    </div>
  );
}

export function TeachersView() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const teachers = useTeacherStore((s) => s.teachers);
  const addTeacher = useTeacherStore((s) => s.addTeacher);
  const updateTeacher = useTeacherStore((s) => s.updateTeacher);
  const deleteTeacher = useTeacherStore((s) => s.deleteTeacher);
  const bulkDelete = useTeacherStore((s) => s.bulkDelete);
  const filters = useFilterStore((s) => s.filters);
  const setFilters = useFilterStore((s) => s.setFilters);
  const compactDensity = useUiStore((s) => s.compactDensity);

  const useApiList = Boolean(accessToken);

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [activeTeacher, setActiveTeacher] = useState<Teacher | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [resumeDownloadId, setResumeDownloadId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setListLoading(true);
    setListError(null);
    void (async () => {
      const res = await listTeachersRequest(
        accessToken,
        pageIndex + 1,
        pageSize
      );
      if (cancelled) return;
      setListLoading(false);
      if (!res.ok) {
        setListError(res.message);
        setApiTeachers([]);
        return;
      }
      setApiTeachers(res.teachers);
      setApiTotal(res.total);
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, pageIndex, pageSize, fetchKey]);

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

  const filtered = useMemo(() => {
    const source = useApiList ? apiTeachers : teachers;
    return filterTeachers(source, filters);
  }, [useApiList, apiTeachers, teachers, filters]);

  const selectedRows = useMemo(() => {
    const ids = Object.keys(rowSelection).filter((id) => rowSelection[id]);
    return filtered.filter((t) => ids.includes(t.id));
  }, [filtered, rowSelection]);

  const exportName = () =>
    `teachers-export-${new Date().toISOString().slice(0, 10)}`;

  const handleExport = useCallback(
    async (
      scope: "all" | "filtered" | "selected",
      format: "xlsx" | "csv"
    ) => {
      if (accessToken) {
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
          filters: scope === "filtered" ? filters : undefined,
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
      if (scope === "filtered") data = filtered;
      if (scope === "selected") {
        const ids = new Set(selectedRows.map((t) => t.id));
        data = filtered.filter((t) => ids.has(t.id));
        if (!data.length) {
          toast.error("Select at least one row");
          return;
        }
      }
      if (format === "xlsx") exportTeachersXlsx(data, exportName());
      else exportTeachersCsv(data, exportName());
      toast.success("Export started", {
        description: `${data.length} record(s) · ${format.toUpperCase()}`,
      });
    },
    [accessToken, selectedRows, filters, teachers, filtered]
  );

  const openAdd = () => {
    setFormMode("add");
    setActiveTeacher(null);
    setFormOpen(true);
  };

  const openEdit = (t: Teacher) => {
    setFormMode("edit");
    setActiveTeacher(t);
    setFormOpen(true);
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
              variant="secondary"
              onClick={() => setFilterOpen(true)}
            >
              <Filter className="mr-1 h-4 w-4" />
              Advanced filters
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
        <FilterChips />
      </div>

      {useApiList && listLoading ? (
        <TableSkeleton rows={Math.min(pageSize, 12)} />
      ) : useApiList && listError ? (
        <p className="px-1 text-sm text-muted-foreground">
          Could not load this page. Fix the issue above and retry.
        </p>
      ) : useApiList &&
          !listError &&
          filtered.length === 0 &&
          apiTotal === 0 ? (
        <EmptyState
          icon={Upload}
          title="No teachers yet"
          description="Create a teacher or check your API. Signed-in users load data from the server."
          actionLabel="Add teacher"
          onAction={openAdd}
        />
      ) : !useApiList && filtered.length === 0 ? (
        <EmptyState
          icon={Upload}
          title="No teachers match"
          description="Adjust filters or import a spreadsheet to grow your roster."
          actionLabel="Reset filters"
          onAction={() => useFilterStore.getState().resetFilters()}
        />
      ) : (
        <TeacherTable
          data={filtered}
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
          onDownloadResume={(t) => {
            void (async () => {
              if (!accessToken) {
                toast.error("Sign in to download resume");
                return;
              }
              setResumeDownloadId(t.id);
              const result = await downloadTeacherResumeRequest(
                accessToken,
                t.id,
                t.resumeFileName
              );
              setResumeDownloadId(null);
              if (!result.ok) {
                toast.error("Download failed", {
                  description: result.message,
                });
                return;
              }
              toast.success("Resume downloaded", {
                description: result.filename,
              });
            })();
          }}
          resumeDownloadBusyId={resumeDownloadId}
        />
      )}

      <TeacherFormDrawer
        key={activeTeacher?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        teacher={activeTeacher}
        teachers={teachers}
        onSave={(t) => {
          if (formMode === "add") {
            addTeacher(t);
            if (accessToken) {
              setPageIndex(0);
              refetchTeachers();
            }
          } else {
            updateTeacher(t.id, t);
            if (accessToken) refetchTeachers();
          }
        }}
      />
      <FilterDrawer open={filterOpen} onOpenChange={setFilterOpen} />
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
