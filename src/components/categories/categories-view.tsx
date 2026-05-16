"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { ChevronDown, Loader2, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  createCategoryRequest,
  createSubcategoryRequest,
  deleteCategoryRequest,
  listCategoriesRequest,
  updateCategoryRequest,
  type CategoriesPagination,
} from "@/lib/categories-api";
import { useAuthStore } from "@/store/auth-store";
import type { Category, SubCategory } from "@/types/category";
import { uid } from "@/utils/id";

type SubDraftRow = { id: string; value: string };

const CATEGORIES_PAGE_SIZE = 10;

/** Non-empty trimmed values, case-insensitive de-duplicated, order preserved. */
function normalizeSubNamesFromValues(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = v.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function CategoryNameEditor({
  category,
  accessToken,
  onRenamed,
  disabled,
}: {
  category: Category;
  accessToken: string | null;
  onRenamed: () => Promise<void>;
  disabled?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(category.name);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(category.name);
    }
  }, [category.id, category.name, isEditing]);

  const cancel = () => {
    setDraft(category.name);
    setIsEditing(false);
  };

  const save = async () => {
    if (disabled || saving) return;
    const next = draft.trim();
    if (!next) {
      toast.error("Category name required", {
        description: "Name cannot be empty.",
      });
      return;
    }
    if (next === category.name) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    const res = await updateCategoryRequest(
      accessToken,
      category.id,
      next
    );
    setSaving(false);
    if (!res.ok) {
      toast.error("Could not rename category", {
        description: res.message,
      });
      return;
    }
    toast.success("Category renamed");
    setIsEditing(false);
    await onRenamed();
  };

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      {!isEditing ? (
        <>
          <span className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-base font-medium leading-snug">
            {category.name}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0"
            disabled={disabled}
            onClick={() => {
              setDraft(category.name);
              setIsEditing(true);
            }}
          >
            Edit
          </Button>
        </>
      ) : (
        <>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            disabled={disabled || saving}
            className="h-9 min-w-0 flex-1 sm:max-w-[min(100%,20rem)]"
            aria-label="Category name"
            autoFocus
          />
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            disabled={disabled || saving}
            onClick={() => void save()}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save changes"
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="shrink-0"
            disabled={disabled || saving}
            onClick={cancel}
          >
            Cancel
          </Button>
        </>
      )}
    </div>
  );
}

function SubcategoryNameEditor({
  sub,
  accessToken,
  removing,
  onRemove,
  onRenamed,
  mutating,
}: {
  sub: SubCategory;
  accessToken: string | null;
  removing: boolean;
  onRemove: () => void;
  onRenamed: () => Promise<void>;
  mutating: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(sub.name);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(sub.name);
    }
  }, [sub.id, sub.name, isEditing]);

  const cancel = () => {
    setDraft(sub.name);
    setIsEditing(false);
  };

  const save = async () => {
    if (removing || saving || mutating) return;
    const next = draft.trim();
    if (!next) {
      toast.error("Sub-item name required");
      return;
    }
    if (next === sub.name) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    const res = await updateCategoryRequest(accessToken, sub.id, next);
    setSaving(false);
    if (!res.ok) {
      toast.error("Could not rename sub-item", {
        description: res.message,
      });
      return;
    }
    toast.success("Sub-item renamed");
    setIsEditing(false);
    await onRenamed();
  };

  return (
    <div className="flex flex-col gap-2 border-t border-border/60 px-3 py-2.5 first:border-t-0 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/80 bg-transparent"
          aria-hidden
        />
        {!isEditing ? (
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {sub.name}
          </span>
        ) : (
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            disabled={removing || saving || mutating}
            className="h-9 min-w-0 flex-1 bg-background sm:max-w-md"
            aria-label={`Sub-item ${sub.name}`}
            autoFocus
          />
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pl-0">
        {!isEditing ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={mutating || removing}
            onClick={() => {
              setDraft(sub.name);
              setIsEditing(true);
            }}
          >
            Edit
          </Button>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              disabled={saving || removing || mutating}
              onClick={() => void save()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save changes"
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={saving || removing}
              onClick={cancel}
            >
              Cancel
            </Button>
          </>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`Remove ${sub.name}`}
          disabled={removing || saving}
          onClick={onRemove}
        >
          {removing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function CategoriesView() {
  const accessToken = useAuthStore((s) => s.accessToken);

  const [categories, setCategories] = useState<Category[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [removingSubId, setRemovingSubId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<CategoriesPagination>({
    page: 1,
    limit: CATEGORIES_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
    count: 0,
  });

  const [name, setName] = useState("");
  const [subDraftRows, setSubDraftRows] = useState<SubDraftRow[]>(() => [
    { id: uid("subf"), value: "" },
  ]);
  const [subInputs, setSubInputs] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const loadCategories = useCallback(
    async (pageOverride?: number) => {
      const pageToLoad = pageOverride ?? page;
      setListLoading(true);
      const result = await listCategoriesRequest(
        accessToken,
        pageToLoad,
        CATEGORIES_PAGE_SIZE
      );
      setListLoading(false);
      if (!result.ok) {
        toast.error("Could not load categories", {
          description: result.message,
        });
        setCategories([]);
        return;
      }
      setCategories(result.categories);
      setPagination(result.pagination);
      if (pageOverride != null) {
        setPage(result.pagination.page);
      }
    },
    [accessToken, page]
  );

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const toggleOpen = (id: string) => {
    setExpanded((m) => ({ ...m, [id]: !m[id] }));
  };

  const handleAddCategory = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name required", {
        description: "Enter a category name before saving.",
      });
      return;
    }

    const subNames = normalizeSubNamesFromValues(
      subDraftRows.map((r) => r.value)
    );

    setMutating(true);
    const result = await createCategoryRequest(
      accessToken,
      trimmed,
      subNames
    );
    setMutating(false);

    if (!result.ok) {
      toast.error("Could not create category", { description: result.message });
      return;
    }

    setName("");
    setSubDraftRows([{ id: uid("subf"), value: "" }]);
    setExpanded((m) => ({ ...m, [result.id]: true }));
    await loadCategories(1);

    toast.success(
      subNames.length > 0
        ? `Created “${trimmed}” with ${subNames.length} sub-item${subNames.length === 1 ? "" : "s"}.`
        : `Created “${trimmed}”.`
    );
  };

  const handleAddSub = async (categoryId: string) => {
    const raw = (subInputs[categoryId] ?? "").trim();
    if (!raw) {
      toast.error("Subcategory name required");
      return;
    }

    setMutating(true);
    const result = await createSubcategoryRequest(
      accessToken,
      categoryId,
      raw
    );
    setMutating(false);

    if (!result.ok) {
      toast.error("Could not add subcategory", {
        description: result.message,
      });
      return;
    }

    setSubInputs((m) => ({ ...m, [categoryId]: "" }));
    toast.success("Subcategory added");
    await loadCategories();
  };

  const handleDeleteCategory = async (c: Category) => {
    setMutating(true);
    const result = await deleteCategoryRequest(accessToken, c.id);
    setMutating(false);
    if (!result.ok) {
      toast.error("Could not delete category", {
        description: result.message,
      });
      return;
    }
    setSubInputs((m) => {
      const next = { ...m };
      delete next[c.id];
      return next;
    });
    setExpanded((m) => {
      const next = { ...m };
      delete next[c.id];
      return next;
    });
    toast.success("Category removed");
    await loadCategories();
  };

  const handleDeleteSubcategory = async (
    _categoryId: string,
    subcategoryId: string,
    label: string
  ) => {
    setRemovingSubId(subcategoryId);
    const result = await deleteCategoryRequest(accessToken, subcategoryId);
    setRemovingSubId(null);
    if (!result.ok) {
      toast.error("Could not remove subcategory", {
        description: result.message,
      });
      return;
    }
    toast.success(`Removed “${label}”`);
    await loadCategories();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="Categories" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tags className="h-4 w-4" />
            Add category & sub-items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <form onSubmit={handleAddCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Category name</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Subject, Region, Board"
                autoComplete="off"
                disabled={mutating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-sub-first">Subcategories (optional)</Label>
              <div className="space-y-2">
                {subDraftRows.map((row, index) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <Input
                      id={index === 0 ? "cat-sub-first" : undefined}
                      value={row.value}
                      onChange={(e) =>
                        setSubDraftRows((rows) =>
                          rows.map((r) =>
                            r.id === row.id
                              ? { ...r, value: e.target.value }
                              : r
                          )
                        )
                      }
                      placeholder="Sub-item name"
                      autoComplete="off"
                      disabled={mutating}
                      className="min-w-0 flex-1"
                    />
                    {subDraftRows.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={mutating}
                        aria-label="Remove this sub-item row"
                        onClick={() =>
                          setSubDraftRows((rows) =>
                            rows.filter((r) => r.id !== row.id)
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={mutating}
                onClick={() =>
                  setSubDraftRows((rows) => [
                    ...rows,
                    { id: uid("subf"), value: "" },
                  ])
                }
              >
                Add more
              </Button>
            </div>
            <Button type="submit" disabled={mutating}>
              {mutating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Create category & sub-items"
              )}
            </Button>
          </form>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-semibold">Your categories</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                disabled={listLoading}
                onClick={() => void loadCategories()}
              >
                {listLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>
            {listLoading ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : categories.length === 0 ? (
              <EmptyState icon={Tags} title="No categories yet" />
            ) : (
              <div className="overflow-hidden rounded-xl border bg-card">
                {categories.map((c) => {
                  const subs = c.subcategories ?? [];
                  const isOpen = expanded[c.id] ?? false;
                  return (
                    <div
                      key={c.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <div className="flex items-stretch gap-0">
                        <button
                          type="button"
                          className={cn(
                            "flex shrink-0 items-center justify-center px-2 py-3 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
                            isOpen && "bg-muted/20"
                          )}
                          onClick={() => toggleOpen(c.id)}
                          aria-expanded={isOpen}
                          aria-label={
                            isOpen ? "Collapse sub-items" : "Expand sub-items"
                          }
                        >
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 transition-transform",
                              isOpen && "rotate-180"
                            )}
                            aria-hidden
                          />
                        </button>
                        <div
                          className="flex min-w-0 flex-1 items-center gap-2 border-l border-border py-1 pl-1 pr-2"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          role="presentation"
                        >
                          <CategoryNameEditor
                            category={c}
                            accessToken={accessToken}
                            onRenamed={loadCategories}
                            disabled={mutating}
                          />
                          <Badge
                            variant="secondary"
                            className="hidden shrink-0 text-xs sm:inline-flex"
                          >
                            {subs.length}{" "}
                            {subs.length === 1 ? "item" : "items"}
                          </Badge>
                        </div>
                        <div className="flex shrink-0 items-center border-l border-border">
                          <Badge
                            variant="secondary"
                            className="shrink-0 px-2 text-xs sm:hidden"
                          >
                            {subs.length}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto rounded-none px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={mutating}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDeleteCategory(c);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>

                      {isOpen ? (
                        <div className="space-y-0 border-t border-border bg-muted/15 px-3 pb-3 pt-2">
                          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                              id={`sub-${c.id}`}
                              value={subInputs[c.id] ?? ""}
                              onChange={(e) =>
                                setSubInputs((m) => ({
                                  ...m,
                                  [c.id]: e.target.value,
                                }))
                              }
                              placeholder="New subcategory name"
                              className="bg-background sm:max-w-xs"
                              disabled={mutating}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void handleAddSub(c.id);
                                }
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={mutating}
                              onClick={() => void handleAddSub(c.id)}
                            >
                              Add subcategory
                            </Button>
                          </div>

                          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Sub-items
                          </p>
                          <div className="overflow-hidden rounded-lg border bg-background">
                            {subs.length === 0 ? (
                              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                                No subcategories yet — add one above.
                              </p>
                            ) : (
                              subs.map((s) => (
                                <SubcategoryNameEditor
                                  key={s.id}
                                  sub={s}
                                  accessToken={accessToken}
                                  removing={removingSubId === s.id}
                                  mutating={mutating}
                                  onRenamed={loadCategories}
                                  onRemove={() =>
                                    void handleDeleteSubcategory(
                                      c.id,
                                      s.id,
                                      s.name
                                    )
                                  }
                                />
                              ))
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
            {!listLoading && pagination.total > 0 ? (
              <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages} ·{" "}
                  {pagination.total}{" "}
                  {pagination.total === 1 ? "category" : "categories"}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPrevPage || listLoading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasNextPage || listLoading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
