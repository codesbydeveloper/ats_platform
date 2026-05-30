"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { List, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  appendTeacherFormFieldOptionRequest,
  listTeacherFormLookupOptionsRequest,
  removeTeacherFormFieldOptionRequest,
  renameTeacherFormFieldOptionRequest,
} from "@/lib/teacher-form-api";
import { useAuthStore } from "@/store/auth-store";

const PAGE_SIZE = 10;

interface CategoryOptionsViewProps {
  menuItem: LookupMenuItem;
}

export function CategoryOptionsView({ menuItem }: CategoryOptionsViewProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [options, setOptions] = useState<LookupFieldOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [newOption, setNewOption] = useState("");
  const [page, setPage] = useState(1);
  const [teacherFormFieldKey, setTeacherFormFieldKey] = useState<string | null>(
    null
  );
  const [editOpen, setEditOpen] = useState(false);
  const [editOriginal, setEditOriginal] = useState("");
  const [editValue, setEditValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
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

  const loadValues = useCallback(
    async (pageOverride?: number) => {
    if (!accessToken) {
      setLoading(false);
      setOptions([]);
      setTeacherFormFieldKey(null);
      return;
    }

    const activePage = pageOverride ?? page;
    setLoading(true);
    const fromTeacherForm = await listTeacherFormLookupOptionsRequest(
      accessToken,
      menuItem.slug,
      activePage,
      PAGE_SIZE,
      search
    );
    const result = fromTeacherForm.ok
      ? fromTeacherForm
      : await listLookupFieldOptionsRequest(
          accessToken,
          menuItem.slug,
          activePage,
          PAGE_SIZE,
          search
        );
    setLoading(false);

    if (!result.ok) {
      toast.error("Could not load data", { description: result.message });
      setOptions([]);
      setTeacherFormFieldKey(null);
      return;
    }

    setOptions(result.options);
    setPagination(result.pagination);
    setTeacherFormFieldKey(result.teacherFormFieldKey ?? null);
  },
    [accessToken, menuItem.slug, page, search]
  );

  useEffect(() => {
    void loadValues();
  }, [loadValues]);

  useEffect(() => {
    setPage(1);
  }, [menuItem.slug, search]);

  const serialStart = (pagination.page - 1) * PAGE_SIZE;
  const canManageOptions = Boolean(teacherFormFieldKey && accessToken);

  const handleAddOption = async () => {
    const label = newOption.trim();
    if (!label || !accessToken || !teacherFormFieldKey) return;

    setSaving(true);
    const result = await appendTeacherFormFieldOptionRequest(
      accessToken,
      teacherFormFieldKey,
      label
    );
    setSaving(false);

    if (!result.ok) {
      toast.error("Could not add option", { description: result.message });
      return;
    }

    const total = (result.data.options ?? []).length;
    const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
    setNewOption("");
    setPage(lastPage);
    toast.success("Option added", {
      description: `"${label}" is saved on the teacher form (same as Form builder).`,
    });
    await loadValues(lastPage);
  };

  const openEdit = (name: string) => {
    setEditOriginal(name);
    setEditValue(name);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    const next = editValue.trim();
    if (!next || !accessToken || !teacherFormFieldKey) return;

    setSaving(true);
    const result = await renameTeacherFormFieldOptionRequest(
      accessToken,
      teacherFormFieldKey,
      editOriginal,
      next
    );
    setSaving(false);

    if (!result.ok) {
      toast.error("Could not update option", { description: result.message });
      return;
    }

    setEditOpen(false);
    toast.success("Option updated");
    await loadValues(page);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !accessToken || !teacherFormFieldKey) return;

    setSaving(true);
    const result = await removeTeacherFormFieldOptionRequest(
      accessToken,
      teacherFormFieldKey,
      deleteTarget
    );
    setSaving(false);
    setDeleteTarget(null);

    if (!result.ok) {
      toast.error("Could not delete option", { description: result.message });
      return;
    }

    const total = (result.data.options ?? []).length;
    const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
    const nextPage = Math.min(page, maxPage);
    if (nextPage !== page) setPage(nextPage);

    toast.success("Option removed");
    await loadValues(nextPage);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">
          Home
        </Link>
        <span>/</span>
        <span className="text-foreground">{menuItem.label}</span>
      </div>

      <PageHeader title={menuItem.label} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{menuItem.label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManageOptions ? (
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="add-option">Add option</Label>
                <Input
                  id="add-option"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder={`e.g. B.Sc`}
                  disabled={saving}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleAddOption();
                    }
                  }}
                />
                {/* <p className="text-xs text-muted-foreground">
                  Saves one value to the teacher form field (
                  <code className="text-foreground">{teacherFormFieldKey}</code>
                  ), same PATCH as Form builder.
                </p> */}
              </div>
              <Button
                type="button"
                disabled={saving || !newOption.trim()}
                onClick={() => void handleAddOption()}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add option
              </Button>
            </div>
          ) : null}

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
              title={`No ${menuItem.label} options yet`}
              description={
                canManageOptions
                  ? "Use Add option above to create the first choice (saved via the teacher-form API)."
                  : "This list is read-only here, or the matching teacher-form field was not found."
              }
            />
          ) : (
            <>
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#3F845B] hover:bg-[#3F845B]">
                      <TableHead className="w-16 text-white">S.No</TableHead>
                      <TableHead className="text-white">
                        {menuItem.label}
                      </TableHead>
                      {canManageOptions ? (
                        <TableHead className="w-28 text-right text-white">
                          Actions
                        </TableHead>
                      ) : null}
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
                        {canManageOptions ? (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={saving}
                                aria-label={`Edit ${opt.name}`}
                                onClick={() => openEdit(opt.name)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                disabled={saving}
                                aria-label={`Delete ${opt.name}`}
                                onClick={() => setDeleteTarget(opt.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <p className="text-xs text-muted-foreground">
                Showing {serialStart + 1} to {serialStart + options.length} of{" "}
                {pagination.total} option{pagination.total === 1 ? "" : "s"}
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit option</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-option-value">Value</Label>
            <Input
              id="edit-option-value"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              disabled={saving}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSaveEdit();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving || !editValue.trim()}
              onClick={() => void handleSaveEdit()}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete option?"
        description={
          deleteTarget
            ? `Remove "${deleteTarget}" from ${menuItem.label}? This updates the teacher form field options.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
