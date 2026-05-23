"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MultiToggle({
  label,
  options,
  value,
  onChange,
  minSelected = 0,
}: {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  minSelected?: number;
}) {
  const toggle = (item: string) => {
    if (value.includes(item)) {
      if (value.length <= minSelected) return;
      onChange(value.filter((v) => v !== item));
    } else {
      onChange([...value, item]);
    }
  };
  if (options.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">No options configured.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value.includes(opt);
          return (
            <Button
              key={opt}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              className="rounded-full"
              onClick={() => toggle(opt)}
            >
              {opt}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function SkillsTagsEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [text, setText] = useState("");

  const addFromInput = () => {
    const parts = text
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) {
      if (!next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p);
    }
    onChange(next);
    setText("");
  };

  return (
    <div className="space-y-3">
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addFromInput();
            }
          }}
          placeholder="Type skills, comma-separated — Enter or Add"
          className="min-w-0 flex-1"
        />
        <Button type="button" variant="secondary" onClick={addFromInput}>
          Add
        </Button>
      </div>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer gap-1 pr-1.5 font-normal"
              onClick={() => onChange(value.filter((v) => v !== tag))}
            >
              {tag}
              <span className="text-muted-foreground" aria-hidden>
                ×
              </span>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
