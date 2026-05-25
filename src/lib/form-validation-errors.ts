import type { FieldErrors } from "react-hook-form";

import type { TeacherFormValues } from "@/lib/validations/teacher-form";

/** Flatten react-hook-form / Zod field errors for toast + inline display. */
export function flattenFormFieldErrors(
  errors: FieldErrors<TeacherFormValues>
): Record<string, string> {
  const out: Record<string, string> = {};

  const walk = (node: FieldErrors<TeacherFormValues>, prefix = "") => {
    if (!node || typeof node !== "object") return;

    for (const [key, value] of Object.entries(node)) {
      if (!value) continue;

      const path = prefix ? `${prefix}.${key}` : key;

      if (
        typeof value === "object" &&
        "message" in value &&
        typeof (value as { message?: unknown }).message === "string"
      ) {
        const msg = (value as { message: string }).message.trim();
        if (msg) out[path] = msg;
        continue;
      }

      if (typeof value === "object") {
        walk(value as FieldErrors<TeacherFormValues>, path);
      }
    }
  };

  walk(errors);
  return out;
}

export function formatValidationMessages(
  errs: Record<string, string>
): string {
  const messages = Object.values(errs).filter((m) => m.trim().length > 0);
  if (!messages.length) {
    return "Please check the highlighted fields below.";
  }
  if (messages.length === 1) return messages[0]!;
  if (messages.length <= 3) return messages.join(" · ");
  return `${messages.slice(0, 3).join(" · ")} (+${messages.length - 3} more)`;
}
