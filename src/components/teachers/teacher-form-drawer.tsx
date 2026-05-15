"use client";

import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { ResumeQuickUpload } from "@/components/teachers/resume-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { CITIES, BOARDS, GRADES, ROLES, STATES, SUBJECTS } from "@/data/constants";
import {
  teacherFormSchema,
  type TeacherFormValues,
} from "@/lib/validations/teacher-form";
import type { Teacher } from "@/types/teacher";
import { createTeacherId, uid } from "@/utils/id";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

function defaultWork(): TeacherFormValues["workHistory"][number] {
  return {
    id: uid("work"),
    schoolName: "",
    role: ROLES[0]!,
    from: new Date().toISOString().slice(0, 10),
    to: null,
    currentlyWorking: true,
  };
}

function teacherToFormValues(t: Teacher): TeacherFormValues {
  return {
    name: t.name,
    mobile: t.mobile,
    email: t.email,
    state: t.state,
    city: t.city,
    address: t.address,
    ugCollege: t.ugCollege,
    pgUniversity: t.pgUniversity,
    qualification: t.qualification,
    certifications: t.certifications,
    subject: t.subject,
    boards: t.boards,
    grades: t.grades,
    roles: t.roles,
    currentLocation: t.currentLocation,
    preferredLocation: t.preferredLocation,
    areaOfInterest: t.areaOfInterest,
    currentSalary: t.currentSalary,
    experienceYears: t.experienceYears,
    workHistory: t.workHistory.map((w) => ({
      id: w.id,
      schoolName: w.schoolName,
      role: w.role,
      from: w.from.slice(0, 10),
      to: w.to ? w.to.slice(0, 10) : null,
      currentlyWorking: w.currentlyWorking,
    })),
    resumeFileName: t.resumeFileName,
    resumeMime: t.resumeMime,
    notes: t.notes,
    skills: t.skills,
  };
}

function emptyForm(): TeacherFormValues {
  return {
    name: "",
    mobile: "",
    email: "",
    state: STATES[0]!,
    city: CITIES[STATES[0]!]![0]!,
    address: "",
    ugCollege: "",
    pgUniversity: "",
    qualification: "",
    certifications: "",
    subject: SUBJECTS[0]!,
    boards: [BOARDS[0]!],
    grades: [GRADES[0]!],
    roles: [ROLES[0]!],
    currentLocation: "",
    preferredLocation: "",
    areaOfInterest: "",
    currentSalary: 0,
    experienceYears: 0,
    workHistory: [defaultWork()],
    resumeFileName: null,
    resumeMime: null,
    notes: "",
    skills: [],
  };
}

function toTeacher(
  values: TeacherFormValues,
  existing: Teacher[],
  base?: Teacher
): Teacher {
  const workHistory = values.workHistory.map((w) => ({
    id: w.id,
    schoolName: w.schoolName,
    role: w.role,
    from: new Date(w.from).toISOString(),
    to: w.currentlyWorking ? null : w.to ? new Date(w.to).toISOString() : null,
    currentlyWorking: w.currentlyWorking,
  }));
  return {
    id: base?.id ?? createTeacherId(existing),
    name: values.name,
    email: values.email,
    mobile: values.mobile,
    city: values.city,
    state: values.state,
    address: values.address,
    ugCollege: values.ugCollege,
    pgUniversity: values.pgUniversity,
    qualification: values.qualification,
    certifications: values.certifications ?? "",
    subject: values.subject,
    boards: values.boards,
    grades: values.grades,
    roles: values.roles,
    currentLocation: values.currentLocation,
    preferredLocation: values.preferredLocation,
    areaOfInterest: values.areaOfInterest,
    currentSalary: values.currentSalary,
    experienceYears: values.experienceYears,
    workHistory,
    resumeFileName: values.resumeFileName,
    resumeMime: values.resumeMime,
    notes: values.notes ?? "",
    status: base?.status ?? "active",
    skills: values.skills?.length ? values.skills : ["General"],
    createdAt: base?.createdAt ?? new Date().toISOString(),
  };
}

function MultiToggle({
  label,
  options,
  value,
  onChange,
  minSelected = 1,
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

function SkillsTagsEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [text, setText] = useState("");

  const mergeUnique = (base: string[], additions: string[]) => {
    const next = [...base];
    for (const raw of additions) {
      const t = raw.trim();
      if (!t) continue;
      if (!next.some((x) => x.toLowerCase() === t.toLowerCase())) {
        next.push(t);
      }
    }
    return next;
  };

  const addFromInput = () => {
    const parts = text
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    onChange(mergeUnique(value, parts));
    setText("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="skills-tags-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addFromInput();
            }
          }}
          placeholder="Type skills, comma-separated — Enter or Add"
          className="sm:flex-1"
        />
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 sm:w-auto"
          onClick={addFromInput}
        >
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
              role="button"
              tabIndex={0}
              onClick={() => onChange(value.filter((v) => v !== tag))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange(value.filter((v) => v !== tag));
                }
              }}
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

interface TeacherFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  teacher?: Teacher | null;
  teachers: Teacher[];
  onSave: (teacher: Teacher) => void;
}

const DRAFT_KEY = "ats-teacher-form-draft";

export function TeacherFormDrawer({
  open,
  onOpenChange,
  mode,
  teacher,
  teachers,
  onSave,
}: TeacherFormDrawerProps) {
  const [confirmClose, setConfirmClose] = useState(false);
  const [saving, setSaving] = useState(false);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema) as Resolver<TeacherFormValues>,
    defaultValues: emptyForm(),
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && teacher) {
      form.reset(teacherToFormValues(teacher));
      return;
    }
    if (mode === "add") {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<TeacherFormValues>;
          form.reset({ ...emptyForm(), ...parsed });
          toast.message("Draft restored", {
            description: "Autosaved draft loaded from this browser.",
          });
          return;
        } catch {
          /* fall through */
        }
      }
      form.reset(emptyForm());
    }
  }, [open, mode, teacher, form]);

  const { fields, remove } = useFieldArray({
    control: form.control,
    name: "workHistory",
  });

  const isDirty = form.formState.isDirty;
  const watched = useWatch({ control: form.control });
  const state = useWatch({ control: form.control, name: "state" });
  const workHistoryWatch =
    useWatch({ control: form.control, name: "workHistory" }) ?? [];
  const resumeFileName = useWatch({
    control: form.control,
    name: "resumeFileName",
  });

  useEffect(() => {
    if (!open || mode === "edit") return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(watched));
      } catch {
        /* ignore */
      }
    }, 600);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [watched, open, mode]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const requestClose = (next: boolean) => {
    if (!next && isDirty) {
      setConfirmClose(true);
      return;
    }
    onOpenChange(next);
  };

  const submit = form.handleSubmit(async (values) => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    const built = toTeacher(values, teachers, teacher ?? undefined);
    onSave(built);
    if (mode === "add") {
      localStorage.removeItem(DRAFT_KEY);
    }
    setSaving(false);
    toast.success(
      mode === "add" ? "Teacher added" : "Teacher updated",
      {
        description: `${built.name} is now in your roster.`,
      }
    );
    onOpenChange(false);
    form.reset(mode === "edit" && teacher ? teacherToFormValues(teacher) : emptyForm());
  });

  const cityOptions = CITIES[state ?? STATES[0]!] ?? [];

  return (
    <>
      <Sheet open={open} onOpenChange={requestClose}>
        <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-xl md:max-w-2xl">
          <Form {...form}>
            <div className="flex flex-col gap-4 border-b pb-4 pr-12 sm:flex-row sm:items-start sm:justify-between">
              <SheetHeader className="flex-1 space-y-1.5 p-0 text-left">
                <SheetTitle>
                  {mode === "add" ? "Add teacher" : "Edit teacher"}
                </SheetTitle>
                <SheetDescription>
                  Structured intake inspired by enterprise ATS workflows.
                </SheetDescription>
              </SheetHeader>
              <ResumeQuickUpload
                fileName={resumeFileName ?? null}
                disabled={saving}
                onChange={(next) => {
                  form.setValue("resumeFileName", next.fileName, {
                    shouldDirty: true,
                  });
                  form.setValue("resumeMime", next.mime, {
                    shouldDirty: true,
                  });
                }}
              />
            </div>
            <form
              className="flex flex-1 flex-col gap-6 py-2"
              onSubmit={submit}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Personal details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <Select
                          onValueChange={(v) => {
                            field.onChange(v);
                            const first = CITIES[v]?.[0];
                            if (first) form.setValue("city", first);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="State" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STATES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="City" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cityOptions.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Educational details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="ugCollege"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UG college</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pgUniversity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PG university</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="qualification"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qualification</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="certifications"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Certifications</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Teaching details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject taught</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SUBJECTS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="boards"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <MultiToggle
                            label="Boards taught"
                            options={BOARDS}
                            value={field.value}
                            onChange={field.onChange}
                            minSelected={1}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="grades"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <MultiToggle
                            label="Grades taught"
                            options={GRADES}
                            value={field.value}
                            onChange={field.onChange}
                            minSelected={1}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="roles"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <MultiToggle
                            label="Teacher roles"
                            options={ROLES}
                            value={field.value}
                            onChange={field.onChange}
                            minSelected={1}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Professional details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="currentLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current location</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="preferredLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred location</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="areaOfInterest"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Area of interest</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currentSalary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current salary (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="experienceYears"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total experience (years)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Work experience</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="space-y-3 rounded-lg border bg-muted/30 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Role {index + 1}</p>
                        {fields.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`workHistory.${index}.schoolName`}
                          render={({ field: f }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>School name</FormLabel>
                              <FormControl>
                                <Input {...f} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`workHistory.${index}.role`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select
                                onValueChange={f.onChange}
                                value={f.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {ROLES.map((r) => (
                                    <SelectItem key={r} value={r}>
                                      {r}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`workHistory.${index}.from`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>From</FormLabel>
                              <FormControl>
                                <Input type="date" {...f} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`workHistory.${index}.to`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>To</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  disabled={workHistoryWatch[index]?.currentlyWorking}
                                  {...f}
                                  value={f.value ?? ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`workHistory.${index}.currentlyWorking`}
                          render={({ field: f }) => (
                            <FormItem className="flex flex-row items-center gap-2 space-y-0 md:col-span-2">
                              <FormControl>
                                <Checkbox
                                  checked={f.value}
                                  onCheckedChange={(c) => f.onChange(!!c)}
                                />
                              </FormControl>
                              <FormLabel className="!mt-0 font-normal">
                                Currently working here
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Skills & tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="skills"
                    render={({ field }) => (
                      <FormItem>
                        <SkillsTagsEditor
                          value={field.value ?? []}
                          onChange={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal notes</FormLabel>
                        <FormControl>
                          <Textarea rows={5} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <SheetFooter className="sticky bottom-0 mt-auto border-t bg-background/95 py-4 backdrop-blur">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => requestClose(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : mode === "add" ? "Create teacher" : "Save changes"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="Discard changes?"
        description="You have unsaved edits. Close without saving?"
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setConfirmClose(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
