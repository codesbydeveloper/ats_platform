"use client";

import { useMemo, useState } from "react";
import { Filter, RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  BOARDS,
  CITIES,
  EXPERIENCE_BUCKETS,
  GRADES,
  ROLES,
  SKILLS,
  STATES,
  SUBJECTS,
} from "@/data/constants";
import {
  emptyFilters,
  useFilterStore,
  type TeacherFilters,
} from "@/store/filter-store";
import { useTeacherStore } from "@/store/teacher-store";

function uniq(values: string[]) {
  return Array.from(new Set(values));
}

function ToggleList({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((s) => s !== item));
    } else {
      onChange([...selected, item]);
    }
  };
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      <ScrollArea className="h-40 rounded-md border p-2">
        <div className="space-y-2 pr-3">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={selected.includes(opt)}
                onCheckedChange={() => toggle(opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface FilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilterDrawer({ open, onOpenChange }: FilterDrawerProps) {
  const replaceFilters = useFilterStore((s) => s.replaceFilters);
  const resetFilters = useFilterStore((s) => s.resetFilters);
  const presets = useFilterStore((s) => s.presets);
  const addPreset = useFilterStore((s) => s.addPreset);
  const removePreset = useFilterStore((s) => s.removePreset);
  const teachers = useTeacherStore((s) => s.teachers);

  const [local, setLocal] = useState<TeacherFilters>(() =>
    useFilterStore.getState().filters
  );
  const [presetName, setPresetName] = useState("");

  const apply = () => {
    replaceFilters(local);
    onOpenChange(false);
  };

  const cityOptions = useMemo(() => {
    const list = new Set<string>();
    teachers.forEach((t) => list.add(t.city));
    return uniq([...list, ...Object.values(CITIES).flat()]);
  }, [teachers]);

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setLocal(useFilterStore.getState().filters);
        }
        onOpenChange(o);
      }}
    >
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Advanced filters
          </SheetTitle>
          <SheetDescription>
            Multi-select facets with saved presets stored locally.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 pr-3">
          <div className="grid gap-6 py-2">
            <ToggleList
              label="Subject"
              options={[...SUBJECTS]}
              selected={local.subjects}
              onChange={(subjects) => setLocal((p) => ({ ...p, subjects }))}
            />
            <ToggleList
              label="Role"
              options={[...ROLES]}
              selected={local.roles}
              onChange={(roles) => setLocal((p) => ({ ...p, roles }))}
            />
            <ToggleList
              label="Grade"
              options={[...GRADES]}
              selected={local.grades}
              onChange={(grades) => setLocal((p) => ({ ...p, grades }))}
            />
            <ToggleList
              label="Board"
              options={[...BOARDS]}
              selected={local.boards}
              onChange={(boards) => setLocal((p) => ({ ...p, boards }))}
            />
            <ToggleList
              label="City"
              options={cityOptions.sort()}
              selected={local.cities}
              onChange={(cities) => setLocal((p) => ({ ...p, cities }))}
            />
            <ToggleList
              label="State"
              options={[...STATES]}
              selected={local.states}
              onChange={(states) => setLocal((p) => ({ ...p, states }))}
            />
            <ToggleList
              label="Experience"
              options={EXPERIENCE_BUCKETS.map((b) => b.label)}
              selected={local.experience}
              onChange={(experience) =>
                setLocal((p) => ({ ...p, experience }))
              }
            />
            <ToggleList
              label="Employment status"
              options={["active", "inactive", "pending"]}
              selected={local.status}
              onChange={(status) => setLocal((p) => ({ ...p, status }))}
            />
            <ToggleList
              label="Skills / tags"
              options={[...SKILLS]}
              selected={local.skills}
              onChange={(skills) => setLocal((p) => ({ ...p, skills }))}
            />
            <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
              <Label className="text-xs uppercase text-muted-foreground">
                Saved presets
              </Label>
              <div className="space-y-2">
                {presets.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="justify-start px-2"
                      onClick={() => setLocal(p.filters)}
                    >
                      {p.name}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePreset(p.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                {presets.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No presets yet.</p>
                ) : null}
              </div>
              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="Preset name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    addPreset(presetName, local);
                    setPresetName("");
                  }}
                >
                  <Save className="mr-1 h-3 w-3" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
        <SheetFooter className="gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setLocal(emptyFilters());
              resetFilters();
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button type="button" onClick={apply}>
            Apply filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
