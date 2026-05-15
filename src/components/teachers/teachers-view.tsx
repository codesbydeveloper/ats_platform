"use client";

import { useMemo, useState } from "react";
import type { RowSelectionState } from "@tanstack/react-table";
import {
  Download,
  Filter,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterDrawer } from "@/components/teachers/filter-drawer";
import { ImportExcelModal } from "@/components/teachers/import-excel-modal";
import { TeacherFormDrawer } from "@/components/teachers/teacher-form-drawer";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { filterTeachers } from "@/utils/filter-teachers";
import {
  exportTeachersCsv,
  exportTeachersXlsx,
} from "@/utils/export-teachers";
import { useFilterStore } from "@/store/filter-store";
import { useTeacherStore } from "@/store/teacher-store";
import { useUiStore } from "@/store/ui-store";
import type { Teacher } from "@/types/teacher";

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

function ViewTeacherDialog({
  teacher,
  onClose,
}: {
  teacher: Teacher;
  onClose: () => void;
}) {
  const rows: [string, string][] = [
    ["Teacher ID", teacher.id],
    ["Name", teacher.name],
    ["Email", teacher.email],
    ["Mobile", teacher.mobile],
    ["Location", `${teacher.city}, ${teacher.state}`],
    ["Subject", teacher.subject],
    ["Roles", teacher.roles.join(", ")],
    ["Grades", teacher.grades.join(", ")],
    ["Boards", teacher.boards.join(", ")],
    ["Experience", `${teacher.experienceYears} yrs`],
    ["Salary (₹)", String(teacher.currentSalary)],
    ["Status", teacher.status],
    ["Resume", teacher.resumeFileName ?? "—"],
    ["Notes", teacher.notes || "—"],
  ];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{teacher.name}</DialogTitle>
          <DialogDescription>Read-only profile snapshot.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-1 gap-3 text-sm">
          {rows.map(([k, v]) => (
            <div
              key={k}
              className="flex flex-col rounded-lg border bg-muted/40 px-3 py-2"
            >
              <dt className="text-xs uppercase text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

export function TeachersView() {
  const teachers = useTeacherStore((s) => s.teachers);
  const addTeacher = useTeacherStore((s) => s.addTeacher);
  const updateTeacher = useTeacherStore((s) => s.updateTeacher);
  const deleteTeacher = useTeacherStore((s) => s.deleteTeacher);
  const bulkDelete = useTeacherStore((s) => s.bulkDelete);
  const importTeachers = useTeacherStore((s) => s.importTeachers);
  const filters = useFilterStore((s) => s.filters);
  const setFilters = useFilterStore((s) => s.setFilters);
  const compactDensity = useUiStore((s) => s.compactDensity);

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [activeTeacher, setActiveTeacher] = useState<Teacher | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [viewTeacher, setViewTeacher] = useState<Teacher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const filtered = useMemo(
    () => filterTeachers(teachers, filters),
    [teachers, filters]
  );

  const selectedRows = useMemo(() => {
    const ids = Object.keys(rowSelection).filter((id) => rowSelection[id]);
    return filtered.filter((t) => ids.includes(t.id));
  }, [filtered, rowSelection]);

  const exportName = () =>
    `teachers-export-${new Date().toISOString().slice(0, 10)}`;

  const handleExport = (scope: "all" | "filtered" | "selected", format: "xlsx" | "csv") => {
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
  };

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
        description="Search, filter, and manage your talent pool with ATS-grade tooling."
      />

      <div className="sticky top-14 z-30 -mx-4 border-b bg-background/90 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap gap-2">
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
                <DropdownMenuItem onClick={() => handleExport("all", "xlsx")}>
                  All · XLSX
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("all", "csv")}>
                  All · CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleExport("filtered", "xlsx")}
                >
                  Filtered · XLSX
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport("filtered", "csv")}
                >
                  Filtered · CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleExport("selected", "xlsx")}
                >
                  Selected · XLSX
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport("selected", "csv")}
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
                  onClick={() => handleExport("selected", "xlsx")}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="w-full min-w-[220px] lg:max-w-xs">
            <SearchInput
              value={filters.search}
              onValueChange={(v) => setFilters({ search: v })}
              placeholder="Quick search…"
            />
          </div>
        </div>
        <Separator className="my-3" />
        <FilterChips />
      </div>

      {filtered.length === 0 ? (
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
          onView={(t) => setViewTeacher(t)}
          onEdit={openEdit}
          onDelete={(t) => setDeleteTarget(t)}
          onDownloadResume={(t) => {
            if (!t.resumeFileName) {
              toast.error("No resume on file");
              return;
            }
            toast.success("Resume ready", {
              description: `${t.resumeFileName} · demo download`,
            });
          }}
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
          if (formMode === "add") addTeacher(t);
          else updateTeacher(t.id, t);
        }}
      />
      <FilterDrawer open={filterOpen} onOpenChange={setFilterOpen} />
      <ImportExcelModal
        open={importOpen}
        onOpenChange={setImportOpen}
        teachers={teachers}
        onImport={(incoming) => importTeachers(incoming)}
      />
      {viewTeacher ? (
        <ViewTeacherDialog
          teacher={viewTeacher}
          onClose={() => setViewTeacher(null)}
        />
      ) : null}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Delete teacher?"
        description="This removes the profile from your local workspace."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget) {
            deleteTeacher(deleteTarget.id);
            toast.success("Teacher removed");
          }
          setDeleteTarget(null);
        }}
      />
      <ConfirmDialog
        open={bulkConfirm}
        onOpenChange={setBulkConfirm}
        title="Delete selected teachers?"
        description="Selected rows will be removed from local storage."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          const ids = selectedRows.map((t) => t.id);
          bulkDelete(ids);
          setRowSelection({});
          toast.success("Bulk delete complete");
        }}
      />
    </div>
  );
}
