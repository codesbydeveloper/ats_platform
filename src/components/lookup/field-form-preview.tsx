"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LookupFieldDisplay } from "@/config/lookup-menu";
import { cn } from "@/lib/utils";

interface FieldFormPreviewProps {
  label: string;
  display: LookupFieldDisplay;
  optionNames: string[];
}

/** Read-only preview of how options appear on the Add teacher form. */
export function FieldFormPreview({
  label,
  display,
  optionNames,
}: FieldFormPreviewProps) {
  const previewOptions =
    optionNames.length > 0 ? optionNames : ["(add options below)"];

  return (
    <Card className="border-dashed bg-muted/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          How this looks on Add teacher
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {display === "chips" ? (
          <>
            <p className="text-sm font-medium">{label}</p>
            <div className="flex flex-wrap gap-2">
              {previewOptions.map((opt, i) => (
                <Button
                  key={opt}
                  type="button"
                  size="sm"
                  variant={i === 0 ? "default" : "outline"}
                  className="pointer-events-none rounded-full"
                  tabIndex={-1}
                >
                  {opt}
                </Button>
              ))}
            </div>
          </>
        ) : display === "dropdown" ? (
          <div className="max-w-xs space-y-2">
            <p className="text-sm font-medium">{label}</p>
            <Select disabled value={previewOptions[0]}>
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {previewOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">{label}</p>
            <div className="flex flex-wrap gap-2">
              {previewOptions.map((opt) => (
                <Badge
                  key={opt}
                  variant="secondary"
                  className={cn(
                    "rounded-full px-3 py-1 font-normal",
                    opt.startsWith("(") && "text-muted-foreground"
                  )}
                >
                  {opt}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
