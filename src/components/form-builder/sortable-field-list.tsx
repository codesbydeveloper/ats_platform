"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Filter, GripVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isFieldFilterEnabled } from "@/lib/teacher-form-api";
import { cn } from "@/lib/utils";
import type { ApiTeacherFormField } from "@/types/teacher-form-api";

type SortableFieldListProps = {
  sectionId: string;
  fields: ApiTeacherFormField[];
  busy: boolean;
  onReorder: (sectionId: string, orderedKeys: string[]) => void;
  onToggleFilter: (fieldKey: string, enabled: boolean) => void;
  onEdit: (field: ApiTeacherFormField) => void;
  onDelete: (fieldKey: string) => void;
};

function SortableFieldRow({
  field,
  busy,
  onToggleFilter,
  onEdit,
  onDelete,
}: {
  field: ApiTeacherFormField;
  busy: boolean;
  onToggleFilter: (fieldKey: string, enabled: boolean) => void;
  onEdit: (field: ApiTeacherFormField) => void;
  onDelete: (fieldKey: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 px-3 py-2.5",
        isDragging && "z-10 bg-muted/80 shadow-sm"
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          className="touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Drag to reorder ${field.label}`}
          disabled={busy}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <p className="font-medium">{field.label}</p>
      </div>
      <div className="flex items-center gap-2">
        {isFieldFilterEnabled(field) ? (
          <Badge variant="secondary" className="gap-1">
            <Filter className="h-3 w-3" />
            Filter
          </Badge>
        ) : null}
        {field.options?.length ? (
          <Badge variant="outline">{field.options.length} options</Badge>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={isFieldFilterEnabled(field) ? "default" : "outline"}
              size="icon"
              className="h-8 w-8 shrink-0"
              disabled={busy}
              aria-pressed={isFieldFilterEnabled(field)}
              aria-label={
                isFieldFilterEnabled(field)
                  ? `Remove ${field.label} from advanced filters`
                  : `Use ${field.label} in advanced filters`
              }
              onClick={() =>
                onToggleFilter(field.key, !isFieldFilterEnabled(field))
              }
            >
              <Filter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isFieldFilterEnabled(field)
              ? "In advanced filters — click to remove"
              : "Use in advanced filters"}
          </TooltipContent>
        </Tooltip>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => onEdit(field)}
        >
          Edit
        </Button>
        {field.deletable !== false && field.key !== "name" ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            disabled={busy}
            onClick={() => onDelete(field.key)}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function SortableFieldList({
  sectionId,
  fields,
  busy,
  onReorder,
  onToggleFilter,
  onEdit,
  onDelete,
}: SortableFieldListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((f) => f.key === active.id);
    const newIndex = fields.findIndex((f) => f.key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(fields, oldIndex, newIndex);
    onReorder(sectionId, reordered.map((f) => f.key));
  };

  if (fields.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
        No fields in this section yet.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={fields.map((f) => f.key)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="divide-y rounded-md border">
          {fields.map((field) => (
            <SortableFieldRow
              key={field.key}
              field={field}
              busy={busy}
              onToggleFilter={onToggleFilter}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
