"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Download,
  Eye,
  List,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TeacherFormDrawer } from "@/components/teachers/teacher-form-drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LookupMenuItem } from "@/config/lookup-menu";
import {
  listLookupFieldOptionsRequest,
  type LookupFieldOption,
  type LookupFieldOptionsPagination,
} from "@/lib/categories-api";
import { listTeacherFormLookupOptionsRequest } from "@/lib/teacher-form-api";
import {
  deleteTeacherRequest,
  downloadTeacherResumeRequest,
  getTeacherRequest,
} from "@/lib/teachers-api";
import { useAuthStore } from "@/store/auth-store";
import { useTeacherStore } from "@/store/teacher-store";
import type { Teacher } from "@/types/teacher";

const PAGE_SIZE = 10;

interface CategoryOptionsViewProps {
  menuItem: LookupMenuItem;
}

export function CategoryOptionsView({ menuItem }: CategoryOptionsViewProps) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const teachers = useTeacherStore((s) => s.teachers);
  const updateTeacher = useTeacherStore((s) => s.updateTeacher);
  const deleteTeacher = useTeacherStore((s) => s.deleteTeacher);
  const [options, setOptions] = useState<LookupFieldOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [resumeDownloadBusyId, setResumeDownloadBusyId] = useState<
    string | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [pagination, setPagination] = useState<LookupFieldOptionsPagination>({
    slug: menuItem.slug,
    field: menuItem.label,
    parent: null,
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
    count: 0,
  });

  const loadValues = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setOptions([]);
      return;
    }

    setLoading(true);
    const fromTeacherForm = await listTeacherFormLookupOptionsRequest(
      accessToken,
      menuItem.slug,
      page,
      PAGE_SIZE,
      search
    );
    const result =
      fromTeacherForm.ok
        ? fromTeacherForm
        : await listLookupFieldOptionsRequest(
            accessToken,
            menuItem.slug,
            page,
            PAGE_SIZE,
            search
          );
    setLoading(false);

    if (!result.ok) {
      toast.error("Could not load data", { description: result.message });
      setOptions([]);
      return;
    }

    setOptions(result.options);
    setPagination(result.pagination);
  }, [accessToken, menuItem.slug, page, search]);

  useEffect(() => {
    void loadValues();
  }, [loadValues]);

  useEffect(() => {
    setPage(1);
  }, [menuItem.slug, search]);

  const resolveTeacher = async (
    teacherId: number | undefined
  ): Promise<Teacher | null> => {
    if (teacherId == null) {
      toast.error("No teacher linked to this row");
      return null;
    }
    if (!accessToken) {
      toast.error("Sign in required");
      return null;
    }
    const id = String(teacherId);
    const result = await getTeacherRequest(accessToken, id);
    if (!result.ok) {
      toast.error("Could not load teacher", { description: result.message });
      return null;
    }
    return result.teacher;
  };

  const handleView = (opt: LookupFieldOption) => {
    if (opt.teacher_id == null) return;
    router.push(`/teachers/${opt.teacher_id}`);
  };

  const handleEdit = async (opt: LookupFieldOption) => {
    const teacher = await resolveTeacher(opt.teacher_id);
    if (!teacher) return;
    setEditTeacher(teacher);
    setFormOpen(true);
  };

  const handleDownloadResume = async (opt: LookupFieldOption) => {
    const teacher = await resolveTeacher(opt.teacher_id);
    if (!teacher || !accessToken) return;
    setResumeDownloadBusyId(teacher.id);
    const result = await downloadTeacherResumeRequest(
      accessToken,
      teacher.id,
      teacher.resumeFileName
    );
    setResumeDownloadBusyId(null);
    if (!result.ok) {
      toast.error("Download failed", { description: result.message });
      return;
    }
    toast.success("Resume downloaded", { description: result.filename });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !accessToken) return;
    const result = await deleteTeacherRequest(accessToken, deleteTarget.id);
    if (!result.ok) {
      toast.error("Delete failed", { description: result.message });
      return;
    }
    deleteTeacher(deleteTarget.id);
    toast.success("Teacher deleted");
    setDeleteTarget(null);
    await loadValues();
  };

  const serialStart = (pagination.page - 1) * PAGE_SIZE;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">
          Home
        </Link>
        <span>/</span>
        <span className="text-foreground">{menuItem.label}</span>
      </div>

      <PageHeader
        title={menuItem.label}

      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{menuItem.label}</CardTitle>
         
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="filter-values">Search</Label>
            <Input
              id="filter-values"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Filter ${menuItem.label.toLowerCase()}…`}
              className="max-w-sm"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : options.length === 0 ? (
            <EmptyState
              icon={List}
              title={`No ${menuItem.label} data yet`}
              description="When teachers are created with this field filled in, values will appear here."
            />
          ) : (
            <>
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary hover:bg-primary">
                      <TableHead className="w-16 text-primary-foreground">
                        S.No
                      </TableHead>
                      <TableHead className="text-primary-foreground">
                        {menuItem.label}
                      </TableHead>
                      <TableHead className="w-16 text-right text-primary-foreground">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {options.map((opt, idx) => (
                      <TableRow
                        key={`${opt.id}-${opt.teacher_id ?? idx}`}
                        className={idx % 2 === 1 ? "bg-muted/30" : undefined}
                      >
                        <TableCell className="font-medium text-muted-foreground">
                          {serialStart + idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {opt.name}
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Row actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                disabled={opt.teacher_id == null}
                                onClick={() => handleView(opt)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={opt.teacher_id == null}
                                onClick={() => void handleEdit(opt)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={
                                  opt.teacher_id == null ||
                                  resumeDownloadBusyId ===
                                    String(opt.teacher_id)
                                }
                                onClick={() => void handleDownloadResume(opt)}
                              >
                                {resumeDownloadBusyId ===
                                String(opt.teacher_id) ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="mr-2 h-4 w-4" />
                                )}
                                Download resume
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={opt.teacher_id == null}
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  void (async () => {
                                    const t = await resolveTeacher(
                                      opt.teacher_id
                                    );
                                    if (t) setDeleteTarget(t);
                                  })();
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <p className="text-xs text-muted-foreground">
                Showing {serialStart + 1} to{" "}
                {serialStart + options.length} of {pagination.total} teacher
                {pagination.total === 1 ? "" : "s"} 
              </p>

              {pagination.total > 0 ? (
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPrevPage || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasNextPage || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {editTeacher ? (
        <TeacherFormDrawer
          key={editTeacher.id}
          open={formOpen}
          onOpenChange={setFormOpen}
          mode="edit"
          teacher={editTeacher}
          teachers={teachers}
          onSave={(saved) => {
            updateTeacher(saved.id, saved);
            setEditTeacher(saved);
            setFormOpen(false);
            void loadValues();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Delete teacher?"
        description="This removes the teacher from the server and your workspace."
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDeleteConfirm()}
      />
    </div>
  );
}
