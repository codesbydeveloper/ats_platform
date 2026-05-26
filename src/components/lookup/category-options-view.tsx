"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { List, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuthStore } from "@/store/auth-store";

const PAGE_SIZE = 10;

interface CategoryOptionsViewProps {
  menuItem: LookupMenuItem;
}

export function CategoryOptionsView({ menuItem }: CategoryOptionsViewProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [options, setOptions] = useState<LookupFieldOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
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
    </div>
  );
}
