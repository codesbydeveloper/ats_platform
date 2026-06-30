"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type Updater,
  type VisibilityState,
} from "@tanstack/react-table";
import { Eye, Loader2, Pencil, Trash2, X } from "lucide-react";

import { teacherEditPath, teacherProfilePath } from "@/lib/teacher-routes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/shared/table-pagination";
import { parseMultiselectStoredValue } from "@/lib/multiselect-form-value";
import { isPlaceholderValue } from "@/lib/sanitize-api-values";
import { apiFieldKeyToFormKey, formKeyToApiKey } from "@/lib/teacher-form-field-map";
import type { Teacher, TeacherStatus } from "@/types/teacher";
import type { ApiTeacherFormConfig } from "@/types/teacher-form-api";
import { cn } from "@/lib/utils";

const statusVariant: Record<
  Teacher["status"],
  "default" | "secondary" | "outline"
> = {
  active: "default",
  inactive: "secondary",
  pending: "outline",
};

function toggledEmploymentStatus(current: TeacherStatus): TeacherStatus {
  return current === "active" ? "inactive" : "active";
}

/** Columns hidden by default; user can enable via Columns menu. */
const BASE_DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  state: false,
  country: false,
  industry: false,
  qualification: false,
  certifications: false,
  roles: false,
  currentLocation: false,
  currentSalary: false,
  experienceYears: false,
  status: false,
  createdAt: false,
  notes: false,
};

const BASE_OPTIONAL_COLUMN_LABELS: Record<string, string> = {
  state: "State",
  country: "Country",
  industry: "Industry",
  qualification: "Qualification",
  certifications: "Certifications",
  roles: "Roles",
  currentLocation: "Current location",
  currentSalary: "Current salary",
  experienceYears: "Experience (years)",
  status: "Status",
  createdAt: "Created date",
  notes: "Internal notes",
};

const WRAP_CELL_IDS = new Set([
  "teacherDetails",
  "subject",
  "areaOfInterest",
  "roles",
  "grades",
  "boards",
  "qualification",
  "certifications",
  "notes",
  "currentLocation",
]);

function DetailLine({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="leading-snug">
      <span className="font-semibold text-foreground">{label}: </span>
      <span className="text-foreground/90">{children}</span>
    </div>
  );
}

function displayListItems(items: string[]): string[] {
  return items.filter((item) => !isPlaceholderValue(item));
}

function StackedCell({ items }: { items: string[] }) {
  const visible = displayListItems(items);
  if (!visible.length) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-col gap-0.5">
      {visible.map((item, i) => (
        <span key={`${item}-${i}`}>{item}</span>
      ))}
    </div>
  );
}

function subjectLines(teacher: Teacher): string[] {
  return displayListItems(parseMultiselectStoredValue(teacher.subject));
}

function areaOfInterestLines(teacher: Teacher): string[] {
  const fromField = displayListItems(
    parseMultiselectStoredValue(teacher.areaOfInterest)
  );
  if (fromField.length) return fromField;
  const cf = teacher.customFields?.area_of_interest;
  if (Array.isArray(cf)) {
    return displayListItems(cf.map((item) => String(item)));
  }
  if (cf != null) {
    return displayListItems(parseMultiselectStoredValue(String(cf)));
  }
  return [];
}

function rolesCommaSeparated(teacher: Teacher): string {
  const fromRoles = displayListItems(teacher.roles);
  if (fromRoles.length) return fromRoles.join(", ");
  const fromArea = areaOfInterestLines(teacher);
  if (fromArea.length) return fromArea.join(", ");
  return "—";
}

function resolveIndustryLabel(teacher: Teacher): string {
  const cf = teacher.customFields ?? {};
  const raw =
    cf["industry"] ??
    cf["Industry"] ??
    cf["industry_type"] ??
    cf["industryType"] ??
    cf["current_industry"] ??
    cf["currentIndustry"];
  if (raw == null) return "—";
  if (Array.isArray(raw)) {
    const v = raw.map((s) => String(s).trim()).filter(Boolean).join(", ");
    return v || "—";
  }
  const v = String(raw).trim();
  return v || "—";
}

function formatColumnValue(raw: unknown): string {
  if (raw == null) return "—";
  if (Array.isArray(raw)) {
    const v = raw.map((x) => String(x).trim()).filter(Boolean).join(", ");
    return v || "—";
  }
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  const v = String(raw).trim();
  return v || "—";
}

function normalizeColumnId(value: string): string {
  const v = String(value ?? "").trim();
  if (!v) return "";
  return v
    .toLowerCase()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function columnIdToApiKey(id: string): string {
  // Prefer explicit built-in mapping when available.
  const mapped = formKeyToApiKey(id);
  if (mapped !== id) return mapped;
  if (id === "createdAt") return "created_at";
  return normalizeColumnId(id) || id;
}

function apiKeyToColumnId(apiKey: string): string {
  const formKey = apiFieldKeyToFormKey(apiKey);
  if (typeof formKey === "string") return formKey;
  return normalizeColumnId(apiKey) || apiKey;
}

type DynamicColumnSpec = {
  id: string;
  label: string;
  getValue: (t: Teacher) => unknown;
};

function buildDynamicColumnSpecs(
  config: ApiTeacherFormConfig | null | undefined
): DynamicColumnSpec[] {
  if (!config?.sections?.length) return [];

  const reserved = new Set<string>([
    // Fixed / existing columns
    "select",
    "teacherDetails",
    "subject",
    "roles",
    "grades",
    "boards",
    "areaOfInterest",
    "area_of_interest",
    "state",
    "country",
    "industry",
    "qualification",
    "certifications",
    "currentLocation",
    "currentSalary",
    "experienceYears",
    "status",
    "createdAt",
    "notes",
    "actions",
  ]);

  const sections = [...config.sections].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  const out: DynamicColumnSpec[] = [];
  for (const section of sections) {
    const fields = [...(section.fields ?? [])].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );

    for (const f of fields) {
      if (!f?.key?.trim()) continue;
      if (f.type === "work_experience") continue;

      const apiKey = f.key.trim();
      const formKey = apiFieldKeyToFormKey(apiKey);

      const baseId =
        typeof formKey === "string" ? formKey : normalizeColumnId(apiKey) || apiKey;
      if (!baseId) continue;

      const id = baseId;
      if (reserved.has(id)) continue;
      reserved.add(id);

      out.push({
        id,
        label: String(f.label ?? apiKey),
        getValue: (t) => {
          const anyT = t as unknown as Record<string, unknown>;
          if (formKey && formKey in anyT) return anyT[formKey];
          const cf = (t.customFields ?? {}) as Record<string, unknown>;
          return cf[apiKey] ?? (formKey ? cf[String(formKey)] : undefined);
        },
      });
    }
  }

  return out;
}

interface TeacherTableProps {
  data: Teacher[];
  onView: (teacher: Teacher) => void;
  onEdit: (teacher: Teacher) => void;
  onDelete: (teacher: Teacher) => void;
  onOpenResume: (teacher: Teacher) => void;
  onStatusToggle?: (teacher: Teacher) => void;
  statusBusyId?: string | null;
  resumeOpenBusyId?: string | null;
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  compact?: boolean;
  teacherFormConfig?: ApiTeacherFormConfig | null;
  /** Server stored column keys (snake_case API keys like `total_experience`). */
  persistedColumnApiKeys?: string[] | null;
  /** Called after user toggles columns (snake_case API keys). */
  onPersistColumnApiKeys?: (columns: string[]) => void | Promise<void>;
  serverPagination?: {
    pageIndex: number;
    pageSize: number;
    pageCount: number;
    totalCount: number;
    onPageChange: (pageIndex: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    pageSizeOptions?: readonly number[];
  };
}

export function TeacherTable({
  data,
  onView,
  onEdit,
  onDelete,
  onOpenResume,
  onStatusToggle,
  statusBusyId,
  resumeOpenBusyId,
  rowSelection,
  onRowSelectionChange,
  compact,
  teacherFormConfig,
  persistedColumnApiKeys,
  onPersistColumnApiKeys,
  serverPagination,
}: TeacherTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const dynamicSpecs = useMemo(
    () => buildDynamicColumnSpecs(teacherFormConfig),
    [teacherFormConfig]
  );

  const optionalColumnLabels = useMemo(() => {
    const map: Record<string, string> = { ...BASE_OPTIONAL_COLUMN_LABELS };
    for (const spec of dynamicSpecs) {
      map[spec.id] = spec.label;
    }

    // If multiple ids have the same label, append the key to disambiguate.
    const counts = new Map<string, number>();
    for (const label of Object.values(map)) {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    for (const [id, label] of Object.entries(map)) {
      if ((counts.get(label) ?? 0) > 1) {
        map[id] = `${label} (${id})`;
      }
    }
    return map;
  }, [dynamicSpecs]);

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    const base: VisibilityState = { ...BASE_DEFAULT_COLUMN_VISIBILITY };
    for (const spec of dynamicSpecs) base[spec.id] = false;
    return base;
  });

  // When config loads, add new keys without resetting user choices.
  useEffect(() => {
    if (!dynamicSpecs.length) return;
    setColumnVisibility((prev) => {
      const next: VisibilityState = { ...prev };
      let changed = false;
      for (const spec of dynamicSpecs) {
        if (next[spec.id] === undefined) {
          next[spec.id] = false;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [dynamicSpecs]);

  // Apply persisted columns from API (once per distinct payload).
  const persistedKey = useMemo(
    () => (persistedColumnApiKeys?.length ? persistedColumnApiKeys.slice().sort().join("|") : ""),
    [persistedColumnApiKeys]
  );
  const [appliedPersistedKey, setAppliedPersistedKey] = useState<string>("");
  const [suppressPersist, setSuppressPersist] = useState(false);

  useEffect(() => {
    if (!persistedKey) return;
    if (appliedPersistedKey === persistedKey) return;
    const desiredIds = new Set(
      (persistedColumnApiKeys ?? []).map((k) => apiKeyToColumnId(k))
    );

    setSuppressPersist(true);
    setColumnVisibility((prev) => {
      const next: VisibilityState = { ...prev };
      // Only affect hideable columns we control (present in label map).
      for (const id of Object.keys(optionalColumnLabels)) {
        if (next[id] === undefined) next[id] = false;
        next[id] = desiredIds.has(id);
      }
      return next;
    });
    setAppliedPersistedKey(persistedKey);
    // allow persisting again after state applies
    setTimeout(() => setSuppressPersist(false), 0);
  }, [
    persistedKey,
    appliedPersistedKey,
    persistedColumnApiKeys,
    optionalColumnLabels,
  ]);

  const columns = useMemo<ColumnDef<Teacher>[]>(
    () => [
      {
        id: "select",
        enableHiding: false,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        size: 36,
      },
      {
        id: "teacherDetails",
        enableHiding: false,
        header: "Teacher Details",
        cell: ({ row }) => {
          const t = row.original;
          const resumeBusy = resumeOpenBusyId === t.id;
          const hasResume =
            Boolean(t.resumeFileName?.trim()) || Boolean(t.resumeUrl?.trim());

          return (
            <div className="min-w-[200px] max-w-[320px] space-y-0.5 py-0.5">
              <DetailLine label="ID">
                {t.teacherCode?.trim() || t.id}
              </DetailLine>
              <DetailLine label="Name">{t.name}</DetailLine>
              <DetailLine label="Mobile">{t.mobile}</DetailLine>
              <DetailLine label="Email">{t.email}</DetailLine>
              <DetailLine label="City">{t.city}</DetailLine>
              <DetailLine label="Preferred Cities">
                {t.preferredLocation?.trim() || "—"}
              </DetailLine>
              <DetailLine label="Total Experience">
                {`${Number(t.experienceYears ?? 0) || 0} yrs`}
              </DetailLine>
              <DetailLine label="Resume">
                {hasResume ? (
                  <button
                    type="button"
                    disabled={resumeBusy}
                    onClick={() => onOpenResume(t)}
                    className="inline-flex items-center gap-1 text-left text-primary underline underline-offset-2 hover:text-primary/80 disabled:opacity-50"
                  >
                    {resumeBusy ? (
                      <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                    ) : null}
                    {t.resumeFileName?.trim() || "View resume"}
                  </button>
                ) : (
                  "—"
                )}
              </DetailLine>
            </div>
          );
        },
      },
      {
        id: "subject",
        accessorKey: "subject",
        header: "Subjects Taught",
        cell: ({ row }) => <StackedCell items={subjectLines(row.original)} />,
      },
      {
        id: "areaOfInterest",
        enableHiding: false,
        accessorKey: "areaOfInterest",
        header: () => (
          <div className="leading-tight">
            <span className="block">Roles</span>
            <span className="block text-xs font-normal opacity-90">
              Area of Interest
            </span>
          </div>
        ),
        cell: ({ row }) => (
          <StackedCell items={areaOfInterestLines(row.original)} />
        ),
      },
      {
        id: "grades",
        accessorKey: "grades",
        header: "Grades Taught",
        cell: ({ row }) => (
          <StackedCell items={displayListItems(row.original.grades)} />
        ),
      },
      {
        id: "boards",
        accessorKey: "boards",
        header: "Boards Taught",
        cell: ({ row }) => (
          <StackedCell items={displayListItems(row.original.boards)} />
        ),
      },
      {
        id: "roles",
        header: "Roles",
        accessorFn: (row) => rolesCommaSeparated(row),
        cell: ({ row }) => (
          <span className="max-w-[280px] whitespace-normal">
            {rolesCommaSeparated(row.original)}
          </span>
        ),
      },
      ...dynamicSpecs.map(
        (spec): ColumnDef<Teacher> => ({
          id: spec.id,
          header: spec.label,
          accessorFn: (row) => formatColumnValue(spec.getValue(row)),
          cell: ({ row }) => (
            <span className="max-w-[240px] whitespace-normal">
              {formatColumnValue(spec.getValue(row.original))}
            </span>
          ),
        })
      ),
      {
        id: "state",
        accessorKey: "state",
        header: "State",
      },
      {
        id: "country",
        accessorKey: "country",
        header: "Country",
      },
      {
        id: "industry",
        header: "Industry",
        accessorFn: (row) => resolveIndustryLabel(row),
        cell: ({ row }) => (
          <span className="max-w-[220px] whitespace-normal">
            {resolveIndustryLabel(row.original)}
          </span>
        ),
      },
      {
        id: "qualification",
        accessorKey: "qualification",
        header: "Qualification",
        cell: ({ row }) => (
          <span className="max-w-[200px] whitespace-normal">
            {row.original.qualification}
          </span>
        ),
      },
      {
        id: "certifications",
        accessorKey: "certifications",
        header: "Certifications",
        cell: ({ row }) => (
          <StackedCell
            items={parseMultiselectStoredValue(row.original.certifications)}
          />
        ),
      },
      {
        id: "currentLocation",
        accessorKey: "currentLocation",
        header: "Current location",
      },
      {
        id: "currentSalary",
        accessorKey: "currentSalary",
        header: "Current salary",
        cell: ({ row }) =>
          row.original.currentSalary > 0
            ? row.original.currentSalary.toLocaleString()
            : "—",
      },
      {
        id: "experienceYears",
        accessorKey: "experienceYears",
        header: "Experience",
        cell: ({ row }) =>
          row.original.experienceYears > 0
            ? `${row.original.experienceYears} yrs`
            : "—",
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const t = row.original;
          const busy = statusBusyId === t.id;
          const next = toggledEmploymentStatus(t.status);
          if (!onStatusToggle) {
            return (
              <Badge variant={statusVariant[t.status]}>{t.status}</Badge>
            );
          }
          return (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatusToggle(t)}
              className="inline-flex rounded-full border-0 bg-transparent p-0 disabled:pointer-events-none disabled:opacity-50"
              aria-label={`${t.status} — click to set ${next}`}
            >
              <Badge
                variant={statusVariant[t.status]}
                className="cursor-pointer select-none hover:opacity-90"
              >
                {t.status}
              </Badge>
            </button>
          );
        },
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) =>
          new Date(row.original.createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
      },
      {
        id: "notes",
        accessorKey: "notes",
        header: "Internal notes",
        cell: ({ row }) => (
          <span className="max-w-[240px] whitespace-normal text-muted-foreground">
            {row.original.notes?.trim() || "—"}
          </span>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        header: "Action",
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="flex items-center justify-start gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-border bg-background shadow-sm"
                asChild
              >
                <Link href={teacherEditPath(t)} aria-label={`Edit ${t.name}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => onDelete(t)}
                aria-label={`Delete ${t.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-border bg-background shadow-sm"
                asChild
              >
                <Link href={teacherProfilePath(t)} aria-label={`View ${t.name}`}>
                  <Eye className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          );
        },
        size: 120,
      },
    ],
    [
      onView,
      onEdit,
      onDelete,
      onOpenResume,
      onStatusToggle,
      statusBusyId,
      resumeOpenBusyId,
      dynamicSpecs,
    ]
  );

  const resolvePagination = (updater: Updater<PaginationState>) => {
    if (!serverPagination) return;
    const current: PaginationState = {
      pageIndex: serverPagination.pageIndex,
      pageSize: serverPagination.pageSize,
    };
    const next =
      typeof updater === "function" ? updater(current) : updater;
    serverPagination.onPageChange(next.pageIndex);
  };

  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      ...(serverPagination
        ? {
            pagination: {
              pageIndex: serverPagination.pageIndex,
              pageSize: serverPagination.pageSize,
            },
          }
        : {}),
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: (updater) => {
      setColumnVisibility((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (!suppressPersist && onPersistColumnApiKeys) {
          // Persist only columns that are visible and show up in the Add columns menu.
          const selected = Object.entries(next)
            .filter(([id, visible]) => Boolean(visible) && optionalColumnLabels[id])
            .map(([id]) => columnIdToApiKey(id));

          // De-duplicate while keeping order stable.
          const out: string[] = [];
          const seen = new Set<string>();
          for (const k of selected) {
            if (!k || seen.has(k)) continue;
            seen.add(k);
            out.push(k);
          }
          // Debounce using microtask: multiple rapid toggles collapse naturally.
          queueMicrotask(() => void onPersistColumnApiKeys(out));
        }
        return next;
      });
    },
    onRowSelectionChange,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(serverPagination
      ? {
          manualPagination: true,
          pageCount: Math.max(1, serverPagination.pageCount),
          onPaginationChange: resolvePagination,
        }
      : {
          getPaginationRowModel: getPaginationRowModel(),
        }),
    initialState: serverPagination
      ? undefined
      : { pagination: { pageSize: 10 } },
  });

  const optionalColumns = table
    .getAllLeafColumns()
    .filter((c) => c.getCanHide?.() && optionalColumnLabels[c.id]);
  const optionalColumnsSorted = useMemo(() => {
    const labelFor = (id: string) => optionalColumnLabels[id] ?? id;
    return [...optionalColumns].sort((a, b) => {
      const av = a.getIsVisible();
      const bv = b.getIsVisible();
      if (av !== bv) return av ? -1 : 1; // visible first
      return labelFor(a.id).localeCompare(labelFor(b.id));
    });
  }, [optionalColumns, optionalColumnLabels]);

  return (
    <div className="space-y-3">
      {optionalColumns.length > 0 ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Add columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {optionalColumnsSorted.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(v) => column.toggleVisibility(!!v)}
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {optionalColumnLabels[column.id] ?? column.id}
                    </span>
                    {column.getIsVisible() ? (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        Shown
                      </span>
                    ) : null}
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      <div
        className={cn(
          "overflow-hidden rounded-xl border bg-card shadow-sm",
          compact ? "text-xs" : "text-sm"
        )}
      >
        <div className="max-h-[min(70vh,720px)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-20 bg-[#3F845B] [&_tr]:border-[#356b47] [&_tr]:hover:bg-[#3F845B]">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="whitespace-nowrap border-[#356b47] bg-[#3F845B] font-semibold text-white"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "align-top",
                          WRAP_CELL_IDS.has(cell.column.id)
                            ? "whitespace-normal py-2"
                            : "whitespace-nowrap py-2"
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No teachers match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {serverPagination ? (
        <TablePagination
          pageIndex={serverPagination.pageIndex}
          pageSize={serverPagination.pageSize}
          pageCount={serverPagination.pageCount}
          totalCount={serverPagination.totalCount}
          onPageChange={serverPagination.onPageChange}
          pageSizeOptions={serverPagination.pageSizeOptions}
          onPageSizeChange={serverPagination.onPageSizeChange}
        />
      ) : (
        <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1} · {data.length} rows
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
