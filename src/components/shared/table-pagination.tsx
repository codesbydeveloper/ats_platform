"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function buildPageItems(
  pageIndex: number,
  pageCount: number
): (number | "ellipsis")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i);
  }

  const current = pageIndex;
  const last = pageCount - 1;
  const items: (number | "ellipsis")[] = [0];

  const windowStart = Math.max(1, current - 1);
  const windowEnd = Math.min(last - 1, current + 1);

  if (windowStart > 1) items.push("ellipsis");

  for (let p = windowStart; p <= windowEnd; p++) {
    items.push(p);
  }

  if (windowEnd < last - 1) items.push("ellipsis");
  if (last > 0) items.push(last);

  return items;
}

export interface TablePaginationProps {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  totalCount: number;
  onPageChange: (pageIndex: number) => void;
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

export function TablePagination({
  pageIndex,
  pageSize,
  pageCount,
  totalCount,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
  className,
}: TablePaginationProps) {
  const [goToValue, setGoToValue] = useState("");

  const safePageCount = Math.max(1, pageCount);
  const pageItems = useMemo(
    () => buildPageItems(pageIndex, safePageCount),
    [pageIndex, safePageCount]
  );

  const from = totalCount === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(totalCount, (pageIndex + 1) * pageSize);

  const submitGoTo = () => {
    const n = Number.parseInt(goToValue, 10);
    if (Number.isNaN(n) || n < 1 || n > safePageCount) return;
    onPageChange(n - 1);
    setGoToValue("");
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span>
          Showing <span className="font-medium text-foreground">{from}</span>–
          <span className="font-medium text-foreground">{to}</span> of{" "}
          <span className="font-medium text-foreground">
            {totalCount.toLocaleString()}
          </span>
        </span>
        {pageSizeOptions && onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <span className="text-xs">Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger className="h-8 w-[88px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={pageIndex <= 0}
            onClick={() => onPageChange(0)}
            aria-label="First page"
          >
            <span className="text-xs font-medium">«</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={pageIndex <= 0}
            onClick={() => onPageChange(pageIndex - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {pageItems.map((item, i) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${i}`}
                className="flex h-8 w-8 items-center justify-center text-muted-foreground"
              >
                …
              </span>
            ) : (
              <Button
                key={item}
                type="button"
                variant={item === pageIndex ? "default" : "outline"}
                size="icon"
                className="h-8 min-w-8 px-1"
                onClick={() => onPageChange(item)}
                aria-label={`Page ${item + 1}`}
                aria-current={item === pageIndex ? "page" : undefined}
              >
                {item + 1}
              </Button>
            )
          )}

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={pageIndex >= safePageCount - 1}
            onClick={() => onPageChange(pageIndex + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={pageIndex >= safePageCount - 1}
            onClick={() => onPageChange(safePageCount - 1)}
            aria-label="Last page"
          >
            <span className="text-xs font-medium">»</span>
          </Button>
        </div>

        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitGoTo();
          }}
        >
          <label className="sr-only" htmlFor="table-pagination-goto">
            Go to page
          </label>
          <Input
            id="table-pagination-goto"
            type="number"
            min={1}
            max={safePageCount}
            placeholder="Page"
            value={goToValue}
            onChange={(e) => setGoToValue(e.target.value)}
            className="h-8 w-20 bg-background"
          />
          <Button type="submit" variant="outline" size="sm" className="h-8">
            Go
          </Button>
        </form>
      </div>
    </div>
  );
}
