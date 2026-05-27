"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
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
import type { Teacher, TeacherStatus } from "@/types/teacher";
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
const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  state: false,
  country: false,
  qualification: false,
  certifications: false,
  currentLocation: false,
  currentSalary: false,
  experienceYears: false,
  status: false,
  createdAt: false,
  notes: false,
};

const OPTIONAL_COLUMN_LABELS: Record<string, string> = {
  state: "State",
  country: "Country",
  qualification: "Qualification",
  certifications: "Certifications",
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

function areaOfInterestLines(teacher: Teacher): string[] {
  return parseMultiselectStoredValue(teacher.areaOfInterest);
}

/** Roles column: area of interest when set; otherwise API teacher roles. */
function rolesColumnLines(teacher: Teacher): string[] {
  const aoi = areaOfInterestLines(teacher);
  if (aoi.length) return aoi;
  return displayListItems(teacher.roles);
}

function subjectLines(teacher: Teacher): string[] {
  return displayListItems(parseMultiselectStoredValue(teacher.subject));
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
  serverPagination,
}: TeacherTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  );

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
        id: "roles",
        header: () => (
          <div className="leading-tight">
            <div>Roles</div>
            <div className="text-[10px] font-normal text-white/85">
              Area of interest
            </div>
          </div>
        ),
        cell: ({ row }) => (
          <StackedCell items={rolesColumnLines(row.original)} />
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
    onColumnVisibilityChange: setColumnVisibility,
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
    .filter((c) => c.getCanHide?.() && OPTIONAL_COLUMN_LABELS[c.id]);

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
              {optionalColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(v) => column.toggleVisibility(!!v)}
                >
                  {OPTIONAL_COLUMN_LABELS[column.id] ?? column.id}
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
            <TableHeader className="sticky top-0 z-20 bg-[#1a6b7a] [&_tr]:border-[#155a66] [&_tr]:hover:bg-[#1a6b7a]">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="whitespace-nowrap border-[#155a66] bg-[#1a6b7a] font-semibold text-white"
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
