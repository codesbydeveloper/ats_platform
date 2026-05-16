"use client";

import { useMemo, useState } from "react";
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
import {
  ArrowUpDown,
  Download,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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

/** Next status when user clicks the badge (active ↔ inactive; pending → active). */
function toggledEmploymentStatus(current: TeacherStatus): TeacherStatus {
  return current === "active" ? "inactive" : "active";
}

interface TeacherTableProps {
  data: Teacher[];
  onView: (teacher: Teacher) => void;
  onEdit: (teacher: Teacher) => void;
  onDelete: (teacher: Teacher) => void;
  onDownloadResume: (teacher: Teacher) => void;
  /** Click status badge to flip active ↔ inactive (calls edit API from parent when signed in). */
  onStatusToggle?: (teacher: Teacher) => void;
  statusBusyId?: string | null;
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  compact?: boolean;
  /** Server-driven pages — data is one page only; Prev/Next hit the API */
  serverPagination?: {
    pageIndex: number;
    pageSize: number;
    pageCount: number;
    totalCount: number;
    onPageChange: (pageIndex: number, pageSize: number) => void;
  };
}

export function TeacherTable({
  data,
  onView,
  onEdit,
  onDelete,
  onDownloadResume,
  onStatusToggle,
  statusBusyId,
  rowSelection,
  onRowSelectionChange,
  compact,
  serverPagination,
}: TeacherTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

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
        id: "srNo",
        header: "Sr. No.",
        cell: ({ row, table }) => {
          const { pageIndex, pageSize } = table.getState().pagination;
          const sr = pageIndex * pageSize + row.index + 1;
          return (
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {sr}
            </span>
          );
        },
        enableSorting: false,
        size: 56,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="-ml-3 h-8 px-2 text-xs font-medium"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Name
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
      },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "mobile", header: "Mobile" },
      { accessorKey: "city", header: "City" },
      { accessorKey: "subject", header: "Subject" },
      {
        accessorKey: "roles",
        header: "Roles",
        cell: ({ row }) => row.original.roles.join(", "),
      },
      {
        accessorKey: "grades",
        header: "Grades",
        cell: ({ row }) => row.original.grades.join(", "),
      },
      {
        accessorKey: "boards",
        header: "Boards",
        cell: ({ row }) => row.original.boards.join(", "),
      },
      {
        accessorKey: "experienceYears",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="-ml-3 h-8 px-2 text-xs font-medium"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Experience
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => `${row.original.experienceYears} yrs`,
      },
      {
        accessorKey: "resumeFileName",
        header: "Resume",
        cell: ({ row }) =>
          row.original.resumeFileName ? (
            <span className="text-xs text-primary underline-offset-2 hover:underline">
              {row.original.resumeFileName}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
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
        accessorKey: "createdAt",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="-ml-3 h-8 px-2 text-xs font-medium"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Created
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) =>
          new Date(row.original.createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
      },
      {
        id: "actions",
        enableHiding: false,
        header: "",
        cell: ({ row }) => {
          const t = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onView(t)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(t)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDownloadResume(t)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download resume
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(t)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [onView, onEdit, onDelete, onDownloadResume, onStatusToggle, statusBusyId]
  );

  const resolvePagination = (updater: Updater<PaginationState>) => {
    if (!serverPagination) return;
    const current: PaginationState = {
      pageIndex: serverPagination.pageIndex,
      pageSize: serverPagination.pageSize,
    };
    const next =
      typeof updater === "function" ? updater(current) : updater;
    serverPagination.onPageChange(next.pageIndex, next.pageSize);
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {table
              .getAllLeafColumns()
              .filter((c) => c.getCanHide?.())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(v) => column.toggleVisibility(!!v)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div
        className={cn(
          "rounded-xl border bg-card shadow-sm",
          compact ? "text-xs" : ""
        )}
      >
        <div className="max-h-[min(70vh,720px)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-20 bg-card shadow-sm [&_tr]:border-b">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="hover:bg-transparent">
                  {hg.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="whitespace-nowrap bg-card"
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
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="whitespace-nowrap">
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {serverPagination ? (
            <>
              Page {serverPagination.pageIndex + 1} of{" "}
              {Math.max(1, serverPagination.pageCount)} ·{" "}
              {serverPagination.totalCount} total
            </>
          ) : (
            <>
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1} · {data.length} rows
            </>
          )}
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
    </div>
  );
}
