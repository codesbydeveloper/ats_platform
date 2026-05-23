"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ResumeQuickUpload } from "@/components/teachers/resume-upload";
import { TeacherFormDynamicSections } from "@/components/teachers/teacher-form-dynamic-sections";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getTeacherFormRequest } from "@/lib/teacher-form-api";
import {
  fetchTeacherFormOptions,
  getEmptyTeacherFormOptions,
  type TeacherFormOptionsMap,
} from "@/lib/teacher-form-options";
import { parsedResumeToFormPatch } from "@/lib/parse-resume-to-form";
import { validateDynamicTeacherForm } from "@/lib/validate-dynamic-teacher-form";
import {
  emptyTeacherFormValues,
  teacherFormSchema,
  type TeacherFormValues,
} from "@/lib/validations/teacher-form";
import {
  applyCreatedTeacherFromApi,
  createTeacherRequest,
  parseResumeRequest,
  updateTeacherRequest,
} from "@/lib/teachers-api";
import { useAuthStore } from "@/store/auth-store";
import type { ApiTeacherFormConfig } from "@/types/teacher-form-api";
import type { Teacher } from "@/types/teacher";
import { createTeacherId, uid } from "@/utils/id";

function defaultWork(role = ""): TeacherFormValues["workHistory"][number] {
  return {
    id: uid("work"),
    schoolName: "",
    role,
    from: new Date().toISOString().slice(0, 10),
    to: null,
    currentlyWorking: true,
  };
}

export function teacherToFormValues(t: Teacher): TeacherFormValues {
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
    extraEducation: (t.extraEducation ?? []).map((value) => ({
      id: uid("edu-extra"),
      value,
    })),
    subject: t.subject,
    boards: t.boards,
    grades: t.grades,
    roles: t.roles,
    currentLocation: t.currentLocation,
    preferredLocation: t.preferredLocation,
    areaOfInterest: t.areaOfInterest,
    currentSalary: t.currentSalary,
    experienceYears: t.experienceYears,
    status: t.status,
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
    customFields: t.customFields ?? {},
  };
}

function emptyForm(): TeacherFormValues {
  return emptyTeacherFormValues();
}

function toIsoSafe(value: string | null | undefined): string | null {
  if (value == null || String(value).trim() === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function toTeacher(
  values: TeacherFormValues,
  existing: Teacher[],
  base?: Teacher
): Teacher {
  const workHistory = values.workHistory.map((w) => {
    const fromIso = toIsoSafe(w.from) ?? new Date().toISOString();
    const toIso = w.currentlyWorking ? null : toIsoSafe(w.to ?? null);
    return {
      id: w.id,
      schoolName: w.schoolName,
      role: w.role,
      from: fromIso,
      to: toIso,
      currentlyWorking: w.currentlyWorking,
    };
  });
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
    extraEducation: (values.extraEducation ?? [])
      .map((e) => e.value.trim())
      .filter(Boolean),
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
    status: values.status ?? base?.status ?? "active",
    skills: values.skills?.length ? values.skills : [],
    customFields: values.customFields ?? {},
    createdAt: base?.createdAt ?? new Date().toISOString(),
  };
}

interface TeacherFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  teacher?: Teacher | null;
  teachers: Teacher[];
  onSave: (teacher: Teacher) => void;
}

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
  const [parsingResume, setParsingResume] = useState(false);
  const [formConfig, setFormConfig] = useState<ApiTeacherFormConfig>({
    sections: [],
  });
  const [loadingFormConfig, setLoadingFormConfig] = useState(false);
  const [layoutErrors, setLayoutErrors] = useState<Record<string, string>>({});
  const [formOptions, setFormOptions] = useState<TeacherFormOptionsMap>(
    getEmptyTeacherFormOptions()
  );
  const resumeFileRef = useRef<File | null>(null);

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
      try {
        localStorage.removeItem("ats-teacher-form-draft");
      } catch {
        /* ignore */
      }
      form.reset(emptyForm());
    }
  }, [open, mode, teacher, form]);

  useEffect(() => {
    if (!open) return;
    const token = useAuthStore.getState().accessToken;
    setLoadingFormConfig(true);
    void Promise.all([
      getTeacherFormRequest(token),
      fetchTeacherFormOptions(token),
    ]).then(([formResult, options]) => {
      setLoadingFormConfig(false);
      setFormOptions(options);
      if (!formResult.ok) {
        toast.error("Could not load form layout", {
          description: formResult.message,
        });
        return;
      }
      setFormConfig(formResult.data);
      const hasWork = formResult.data.sections.some((s) =>
        s.fields.some((f) => f.type === "work_experience")
      );
      if (hasWork && form.getValues("workHistory").length === 0) {
        const roleField = formResult.data.sections
          .flatMap((s) => s.fields)
          .find((f) => f.key === "teacher_roles" || f.key === "roles");
        form.setValue("workHistory", [
          defaultWork(roleField?.options?.[0] ?? options.bySlug["teacher-roles"]?.[0] ?? ""),
        ]);
      }
    });
  }, [open, form]);

  const selectedState = useWatch({ control: form.control, name: "state" });

  useEffect(() => {
    if (!open || !selectedState?.trim()) return;
    const cities = formOptions.citiesByState[selectedState];
    if (!cities?.length) return;
    const currentCity = form.getValues("city");
    if (!currentCity || !cities.includes(currentCity)) {
      form.setValue("city", cities[0]!);
    }
  }, [open, selectedState, formOptions, form]);

  const isDirty = form.formState.isDirty;
  const resumeFileName = useWatch({
    control: form.control,
    name: "resumeFileName",
  });

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

  const handleResumeSelected = async (file: File | null) => {
    resumeFileRef.current = file;
    if (!file) return;

    const token = useAuthStore.getState().accessToken;
    if (!token) {
      toast.message("Resume attached", {
        description: "Sign in to auto-fill fields from the resume.",
      });
      return;
    }

    setParsingResume(true);
    try {
      const result = await parseResumeRequest(token, file);
      if (!result.ok) {
        toast.error("Could not read resume", { description: result.message });
        return;
      }

      const patch = parsedResumeToFormPatch(result.data);
      const keys = Object.keys(patch) as (keyof TeacherFormValues)[];
      if (keys.length === 0) {
        toast.message("Resume attached", {
          description: "No profile fields were extracted.",
        });
        return;
      }

      for (const key of keys) {
        const value = patch[key];
        if (value !== undefined) {
          form.setValue(key, value as TeacherFormValues[typeof key], {
            shouldDirty: true,
          });
        }
      }

      toast.success("Form updated from resume", {
        description: `${keys.length} field${keys.length === 1 ? "" : "s"} filled.`,
      });
    } finally {
      setParsingResume(false);
    }
  };

  const applyLayoutValidation = (values: TeacherFormValues): boolean => {
    const errs = validateDynamicTeacherForm(values, formConfig);
    setLayoutErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Form incomplete", {
        description: "Fix the fields marked in red (scroll up if needed).",
      });
      return false;
    }
    return true;
  };

  const runEditSave = async () => {
    const values = form.getValues();
    if (!applyLayoutValidation(values)) return;
    setSaving(true);
    try {
      const built = toTeacher(values, teachers, teacher ?? undefined);
      let saved: Teacher = built;
      const token = useAuthStore.getState().accessToken;
      if (token && teacher) {
        const api = await updateTeacherRequest(
          token,
          teacher.id,
          values,
          resumeFileRef.current
        );
        if (!api.ok) {
          toast.error("Could not update teacher", {
            description: api.message,
          });
          return;
        }
        saved = applyCreatedTeacherFromApi(api.data, built);
        onSave(saved);
        resumeFileRef.current = null;
        toast.success("Teacher updated", {
          description: `${saved.name} is synced with the server.`,
        });
      } else {
        await new Promise((r) => setTimeout(r, 400));
        onSave(built);
        toast.success("Teacher updated", {
          description: `${built.name} is now in your roster.`,
        });
      }

      onOpenChange(false);
      form.reset(teacherToFormValues(saved));
    } catch (e) {
      console.error(e);
      toast.error("Could not save", {
        description:
          e instanceof Error ? e.message : "Something went wrong. Try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const submitAdd = form.handleSubmit(
    async (values) => {
      if (!applyLayoutValidation(values)) return;
      setSaving(true);
      try {
        const token = useAuthStore.getState().accessToken;
        if (!token) {
          toast.error("Session missing", {
            description:
              "Sign in again so your account can create teachers on the server.",
          });
          return;
        }

        const built = toTeacher(values, teachers, teacher ?? undefined);
        const api = await createTeacherRequest(
          token,
          values,
          resumeFileRef.current
        );

        if (!api.ok) {
          toast.error("Could not create teacher", {
            description: api.message,
          });
          return;
        }

        const merged = applyCreatedTeacherFromApi(api.data, built);
        onSave(merged);
        resumeFileRef.current = null;
        toast.success("Teacher added", {
          description: `${merged.name} is synced with the server.`,
        });
        onOpenChange(false);
        form.reset(emptyForm());
      } catch (e) {
        console.error(e);
        toast.error("Could not save", {
          description:
            e instanceof Error ? e.message : "Something went wrong. Try again.",
        });
      } finally {
        setSaving(false);
      }
    },
    () => {
      void form.trigger();
      toast.error("Form incomplete", {
        description: "Fix the fields marked in red (scroll up if needed).",
      });
    }
  );

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (mode === "edit") {
      e.preventDefault();
      void runEditSave();
      return;
    }
    submitAdd(e);
  };

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
             
              </SheetHeader>
              <ResumeQuickUpload
                fileName={resumeFileName ?? null}
                disabled={saving}
                parsing={parsingResume}
                onFileSelected={handleResumeSelected}
                onChange={(next) => {
                  form.setValue("resumeFileName", next.fileName, {
                    shouldDirty: true,
                  });
                  form.setValue("resumeMime", next.mime, {
                    shouldDirty: true,
                  });
                  if (!next.fileName) {
                    resumeFileRef.current = null;
                  }
                }}
              />
            </div>
            <form
              className="flex flex-1 flex-col gap-6 py-2"
              onSubmit={handleFormSubmit}
            >
              {loadingFormConfig ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading form…
                </div>
              ) : (
                <TeacherFormDynamicSections
                  config={formConfig}
                  form={form}
                  formOptions={formOptions}
                  layoutErrors={layoutErrors}
                />
              )}

              <SheetFooter className="sticky bottom-0 mt-auto border-t bg-background/95 py-4 backdrop-blur">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => requestClose(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || loadingFormConfig}>
                  {saving
                    ? "Saving…"
                    : mode === "add"
                      ? "Create teacher"
                      : "Save changes"}
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
