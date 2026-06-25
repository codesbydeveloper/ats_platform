"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  useWatch,
  type Resolver,
  type UseFormReturn,
} from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TeacherResumeActions } from "@/components/teachers/resume-upload";
import { TeacherFormDynamicSections } from "@/components/teachers/teacher-form-dynamic-sections";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  Sheet,
  SheetContent,
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
import {
  mergeApiStringArrays,
  mergeMultiselectFromCustom,
  multiselectHasValue,
  parseApiStringArray,
} from "@/lib/multiselect-form-value";
import {
  flattenFormFieldErrors,
  formatValidationMessages,
} from "@/lib/form-validation-errors";
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
  sanitizeApiText,
  sanitizeTeacherFormValues,
  updateTeacherRequest,
} from "@/lib/teachers-api";
import { useAuthStore } from "@/store/auth-store";
import type { ApiTeacherFormConfig } from "@/types/teacher-form-api";
import type { Teacher } from "@/types/teacher";
import {
  getCityNamesForState,
  getDefaultCityForState,
  getStateNamesForCountry,
} from "@/lib/locations";
import {
  configHasWorkExperienceRows,
  defaultWorkEntry,
  EMPLOYED_FIELD_KEY,
  getEmployedValue,
} from "@/lib/work-experience-form";
import { createTeacherId, uid } from "@/utils/id";
import { unwrapParseResumePayload } from "@/lib/parse-resume-to-form";

export function teacherToFormValues(t: Teacher): TeacherFormValues {
  return {
    name: sanitizeApiText(t.name),
    mobile: sanitizeApiText(t.mobile),
    email: sanitizeApiText(t.email),
    country: sanitizeApiText(t.country) || "India",
    state: sanitizeApiText(t.state),
    city: sanitizeApiText(t.city),
    address: sanitizeApiText(t.address),
    ugCollege: sanitizeApiText(t.ugCollege),
    pgUniversity: sanitizeApiText(t.pgUniversity),
    qualification: sanitizeApiText(t.qualification),
    certifications: mergeMultiselectFromCustom(
      t.certifications,
      t.customFields?.certifications
    ),
    extraEducation: (t.extraEducation ?? []).map((value) => ({
      id: uid("edu-extra"),
      value,
    })),
    subject: mergeMultiselectFromCustom(
      t.subject,
      t.customFields?.subject_taught
    ),
    boards: t.boards,
    grades: t.grades,
    roles: mergeApiStringArrays(
      t.roles,
      t.customFields?.role,
      t.customFields?.teacher_roles
    ),
    currentLocation: sanitizeApiText(t.currentLocation),
    preferredLocation: sanitizeApiText(t.preferredLocation),
    areaOfInterest: mergeMultiselectFromCustom(
      t.areaOfInterest,
      t.customFields?.area_of_interest
    ),
    currentSalary:
      t.currentSalary > 0
        ? t.currentSalary
        : Number(t.customFields?.salary) || 0,
    experienceYears:
      t.experienceYears > 0
        ? t.experienceYears
        : Number(t.customFields?.total_years_experience) || 0,
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
    notes: sanitizeApiText(t.notes),
    skills: t.skills,
    customFields: t.customFields ?? {},
  };
}

function emptyForm(): TeacherFormValues {
  return emptyTeacherFormValues();
}

/** Move legacy customFields multiselect values onto built-in string fields. */
function migrateMultiselectCustomFields(form: UseFormReturn<TeacherFormValues>) {
  const cf = form.getValues("customFields") ?? {};
  const pairs: {
    formKey: "certifications" | "subject" | "areaOfInterest";
    apiKey: string;
  }[] = [
    { formKey: "certifications", apiKey: "certifications" },
    { formKey: "subject", apiKey: "subject_taught" },
    { formKey: "areaOfInterest", apiKey: "area_of_interest" },
  ];

  for (const { formKey, apiKey } of pairs) {
    const current = form.getValues(formKey);
    const legacy = cf[apiKey];
    if (!multiselectHasValue(current) && multiselectHasValue(legacy)) {
      form.setValue(
        formKey,
        mergeMultiselectFromCustom(String(current ?? ""), legacy),
        { shouldDirty: false }
      );
    }
  }

  const roles = form.getValues("roles");
  if (!roles?.length) {
    const fromLegacy = mergeApiStringArrays(cf.role, cf.teacher_roles);
    if (fromLegacy.length) {
      form.setValue("roles", fromLegacy, { shouldDirty: false });
    }
  }

  const salary = form.getValues("currentSalary");
  if (!salary && cf.salary != null && String(cf.salary).trim() !== "") {
    form.setValue("currentSalary", Number(cf.salary) || 0, {
      shouldDirty: false,
    });
  }
  const exp = form.getValues("experienceYears");
  if (!exp && cf.total_years_experience != null) {
    form.setValue(
      "experienceYears",
      Number(cf.total_years_experience) || 0,
      { shouldDirty: false }
    );
  }
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
    country: values.country,
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
    customFields: (values.customFields ?? {}) as Teacher["customFields"],
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
  /** Full-page layout for `/teachers/new` and `/teachers/[id]/edit`; default is side sheet. */
  layout?: "drawer" | "page";
}

export function TeacherFormDrawer({
  open,
  onOpenChange,
  mode,
  teacher,
  teachers,
  onSave,
  layout = "drawer",
}: TeacherFormDrawerProps) {
  const isPage = layout === "page";
  const [confirmClose, setConfirmClose] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsingResume, setParsingResume] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [aiParsedLocation, setAiParsedLocation] = useState<{
    country?: string;
    state?: string;
    city?: string;
  } | null>(null);
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
    resumeFileRef.current = null;
    setAiParsedLocation(null);
    if (mode === "edit" && teacher) {
      const values = teacherToFormValues(teacher);
      const workCount = values.workHistory?.length ?? 0;
      const employed = getEmployedValue(values.customFields);
      const shouldDefaultEmployedYes = workCount > 0 && employed.trim() === "";
      const shouldDefaultEmployedNo = workCount === 0 && employed.trim() === "";
      const customFields = shouldDefaultEmployedYes
        ? { ...(values.customFields ?? {}), [EMPLOYED_FIELD_KEY]: "Yes" }
        : shouldDefaultEmployedNo
          ? { ...(values.customFields ?? {}), [EMPLOYED_FIELD_KEY]: "No" }
          : { ...(values.customFields ?? {}) };
      form.reset({
        ...values,
        customFields,
      });
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
      const hasWork =
        configHasWorkExperienceRows(formResult.data) ||
        formResult.data.sections.some((s) =>
          s.fields.some((f) => f.type === "work_experience")
        );
      if (hasWork && form.getValues("workHistory").length === 0) {
        form.setValue("workHistory", [defaultWorkEntry()]);
      }
      migrateMultiselectCustomFields(form);
    });
  }, [open, form]);

  useEffect(() => {
    if (!open) return;
    migrateMultiselectCustomFields(form);
  }, [open, form]);

  const selectedCountry = useWatch({ control: form.control, name: "country" });
  const selectedState = useWatch({ control: form.control, name: "state" });
  const selectedCity = useWatch({ control: form.control, name: "city" });

  const debugLocation =
    typeof window !== "undefined" &&
    Boolean((window as unknown as { __ATS_DEBUG_LOCATION__?: boolean }).__ATS_DEBUG_LOCATION__);
  const dlog = (...args: unknown[]) => {
    if (!debugLocation) return;
    // eslint-disable-next-line no-console
    console.log("[teacher-form][location]", ...args);
  };

  const aiCityMissing =
    aiParsedLocation != null && !(aiParsedLocation.city ?? "").trim();

  const normalizeOptionKey = (value: string) =>
    value
      .toLowerCase()
      .replace(/[\s._-]+/g, "")
      .replace(/[^a-z]/g, "");

  const fuzzyMatchOption = (value: string, options: string[]): string | null => {
    const v = value.trim();
    if (!v) return null;
    const direct = options.find((o) => o.trim().toLowerCase() === v.toLowerCase());
    if (direct) return direct;
    const key = normalizeOptionKey(v);
    if (!key) return null;
    const matched = options.find((o) => normalizeOptionKey(o) === key);
    return matched ?? null;
  };

  const inferStateFromCity = (
    country: string,
    city: string
  ): { state: string; city: string } | null => {
    const desiredCity = city.trim();
    if (!desiredCity) return null;
    const states = getStateNamesForCountry(country);
    for (const s of states) {
      const cities = getCityNamesForState(country, s);
      if (!cities.length) continue;
      const matchedCity = fuzzyMatchOption(desiredCity, cities);
      if (matchedCity) return { state: s, city: matchedCity };
    }
    return null;
  };

  useEffect(() => {
    if (!open || !selectedCountry?.trim()) return;
    const states = getStateNamesForCountry(selectedCountry);
    if (!states.length) return;
    const currentState = form.getValues("state");
    const currentCity = form.getValues("city");

    // After AI parse: if AI did not provide a state, do not default to a random one.
    if (aiParsedLocation && !(aiParsedLocation.state ?? "").trim()) {
      return;
    }

    // Only auto-set when blank; otherwise keep AI/manual values.
    if (!currentState || !currentState.trim()) {
      const nextState = states[0]!;
      form.setValue("state", nextState, { shouldDirty: false });
      if (!currentCity?.trim() && !aiParsedLocation?.city?.trim()) {
        form.setValue(
          "city",
          getDefaultCityForState(selectedCountry, nextState),
          { shouldDirty: false }
        );
      }
      return;
    }

    // If state isn't in the list, try to normalize it (e.g., "U.P" -> "Uttar Pradesh")
    if (!states.includes(currentState)) {
      const matched = fuzzyMatchOption(currentState, states);
      if (matched && matched !== currentState) {
        form.setValue("state", matched, { shouldDirty: false });
      }
      // Do not overwrite city if it is already set (even if not in the list).
      if (!currentCity?.trim()) {
        if (aiParsedLocation?.city?.trim()) return;
        const next = matched ?? states[0]!;
        form.setValue("city", getDefaultCityForState(selectedCountry, next), {
          shouldDirty: false,
        });
      }
    }
  }, [open, selectedCountry, form]);

  useEffect(() => {
    if (!open || !selectedCountry?.trim() || !selectedState?.trim()) return;
    const cities = getCityNamesForState(selectedCountry, selectedState);
    if (!cities.length) {
      const fallback = formOptions.citiesByState[selectedState];
      if (!fallback?.length) return;
      const currentCity = form.getValues("city");
      // Only auto-set when blank; otherwise keep AI/manual values.
      if (!currentCity || !currentCity.trim()) {
        form.setValue("city", fallback[0]!, { shouldDirty: false });
      } else if (!fallback.includes(currentCity)) {
        const matched = fuzzyMatchOption(currentCity, fallback);
        if (matched && matched !== currentCity) {
          form.setValue("city", matched, { shouldDirty: false });
        }
      }
      return;
    }
    const currentCity = form.getValues("city");
    // Only auto-set when blank; otherwise keep AI/manual values.
    if (!currentCity || !currentCity.trim()) {
      // Only default city when AI parse did not provide a city.
      if (aiParsedLocation && !aiCityMissing) return;
      form.setValue("city", cities[0]!, { shouldDirty: false });
      return;
    }
    if (!cities.includes(currentCity)) {
      const matched = fuzzyMatchOption(currentCity, cities);
      if (matched && matched !== currentCity) {
        form.setValue("city", matched, { shouldDirty: false });
      }
    }
  }, [open, selectedCountry, selectedState, formOptions, form]);

  useEffect(() => {
    if (!open) return;
    const parsedCity = aiParsedLocation?.city?.trim() ?? "";
    if (!parsedCity) return;

    // Don't fight the user: if they changed city manually, leave it.
    const cityDirty = Boolean(form.formState.dirtyFields?.city);
    if (cityDirty) return;

    const currentCity = String(selectedCity ?? "").trim();
    if (currentCity.toLowerCase() === parsedCity.toLowerCase()) return;

    const parsedState = aiParsedLocation?.state?.trim() ?? "";
    const currentState = String(selectedState ?? "").trim();
    if (parsedState && currentState) {
      const stateKey = normalizeOptionKey(parsedState);
      const currentKey = normalizeOptionKey(currentState);
      if (stateKey && currentKey && stateKey !== currentKey) {
        return;
      }
    }

    dlog("restore city from AI", {
      parsedCity,
      selectedCountry,
      selectedState,
      currentCity,
      dirty: form.formState.dirtyFields?.city,
    });
    form.setValue("city", parsedCity, { shouldDirty: false });
  }, [open, aiParsedLocation, selectedCity, selectedState, form]);

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

  const attachResumeFile = (file: File) => {
    resumeFileRef.current = file;
    form.setValue("resumeFileName", file.name, { shouldDirty: true });
    form.setValue("resumeMime", file.type || "application/octet-stream", {
      shouldDirty: true,
    });
  };

  const clearResumeAttachment = () => {
    resumeFileRef.current = null;
    form.setValue("resumeFileName", null, { shouldDirty: true });
    form.setValue("resumeMime", null, { shouldDirty: true });
  };

  const handleResumeUpload = async (file: File) => {
    attachResumeFile(file);
    const token = useAuthStore.getState().accessToken;

    if (mode === "edit" && teacher && token) {
      setUploadingResume(true);
      try {
        const values = sanitizeTeacherFormValues(form.getValues());
        const api = await updateTeacherRequest(
          token,
          teacher.id,
          values,
          file
        );
        if (!api.ok) {
          toast.error("Could not upload resume", { description: api.message });
          return;
        }
        const saved = applyCreatedTeacherFromApi(
          api.data,
          toTeacher(values, teachers, teacher)
        );
        if (saved.resumeFileName) {
          form.setValue("resumeFileName", saved.resumeFileName, {
            shouldDirty: false,
          });
        }
        resumeFileRef.current = null;
        onSave(saved);
        toast.success("Resume uploaded", {
          description: saved.resumeFileName ?? file.name,
        });
      } finally {
        setUploadingResume(false);
      }
      return;
    }

    toast.success("Resume attached", {
      description:
        mode === "add"
          ? "Save the teacher to upload the file to the server."
          : token
            ? "Save the profile to upload the file."
            : "Sign in and save to upload the file.",
    });
  };

  const runAiResumeParse = async (file: File) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      toast.message("Sign in required", {
        description: "Sign in to use AI resume parsing.",
      });
      return;
    }

    setParsingResume(true);
    try {
      const result = await parseResumeRequest(token, file);
      if (!result.ok) {
        toast.error("Could not parse resume", { description: result.message });
        return;
      }

      const patch = parsedResumeToFormPatch(result.data);
      dlog("parse-resume raw -> patch", {
        raw: unwrapParseResumePayload(result.data),
        patch,
      });
      const keys = Object.keys(patch) as (keyof TeacherFormValues)[];
      if (keys.length === 0) {
        toast.message("No fields extracted", {
          description: "Try another resume or fill the form manually.",
        });
        return;
      }

      const current = form.getValues();
      dlog("before reset form values", {
        country: current.country,
        state: current.state,
        city: current.city,
      });
      form.reset(
        {
          ...current,
          ...patch,
          customFields: {
            ...current.customFields,
            ...patch.customFields,
          },
        },
        { keepDirty: true, keepDefaultValues: false }
      );

      // Keep AI location values stable even if the state/city lists are still loading.
      // Important: we also record "missing" city (blank/undefined) so we can default city only in that case.
      const raw = unwrapParseResumePayload(result.data);
      const rawCountry =
        raw && typeof raw.country === "string" ? raw.country : undefined;
      const rawState = raw && typeof raw.state === "string" ? raw.state : undefined;
      const rawCity = raw && typeof raw.city === "string" ? raw.city : "";

      const desiredCountry =
        typeof patch.country === "string" ? patch.country : rawCountry ?? "";
      const desiredState =
        typeof patch.state === "string" ? patch.state : rawState ?? "";
      const desiredCity =
        typeof patch.city === "string" ? patch.city : rawCity ?? "";

      setAiParsedLocation({
        country: desiredCountry || undefined,
        state: desiredState || undefined,
        city: desiredCity,
      });

      // Snap AI values to exact dropdown options when possible (so Select shows a real option).
      if (desiredCountry.trim()) {
        const states = getStateNamesForCountry(desiredCountry);
        // If state missing but city present, infer the correct state from city.
        const inferred =
          !desiredState.trim() && desiredCity.trim()
            ? inferStateFromCity(desiredCountry, desiredCity)
            : null;
        const stateSource = inferred?.state ?? desiredState;
        const citySource = inferred?.city ?? desiredCity;

        const matchedState = stateSource.trim()
          ? fuzzyMatchOption(stateSource, states) ?? stateSource
          : "";

        if (!matchedState) {
          // AI didn't provide a usable state, so keep state/city unselected.
          dlog("no state from AI; clearing state/city", {
            desiredCountry,
            desiredState,
            desiredCity,
          });
          form.setValue("state", "", { shouldDirty: false });
          form.setValue("city", "", { shouldDirty: false });
        } else {
          const prevState = form.getValues("state");
          dlog("snap state", { desiredState: stateSource, matchedState, prevState });
          if (matchedState !== prevState) {
            form.setValue("state", matchedState, { shouldDirty: false });
          }

          if (citySource.trim()) {
            const cities = getCityNamesForState(desiredCountry, matchedState);
            const matchedCity = fuzzyMatchOption(citySource, cities) ?? citySource;
            if (matchedCity) {
              const prevCity = form.getValues("city");
              dlog("snap city", {
                desiredCity: citySource,
                matchedCity,
                prevCity,
                citiesCount: cities.length,
                hasExact: cities.includes(matchedCity),
              });
              // Force-apply AI city even if reset kept a dirty/auto value.
              if (matchedCity !== prevCity) {
                form.setValue("city", matchedCity, { shouldDirty: false });
              }
            }
          }
        }
      }

      dlog("after parse+snap form values", {
        country: form.getValues("country"),
        state: form.getValues("state"),
        city: form.getValues("city"),
      });

      const workCount = patch.workHistory?.length ?? 0;
      toast.success("AI filled the form", {
        description:
          workCount > 0
            ? `${keys.length} field${keys.length === 1 ? "" : "s"} · ${workCount} work row${workCount === 1 ? "" : "s"} — review before saving.`
            : `${keys.length} field${keys.length === 1 ? "" : "s"} filled.`,
      });
    } finally {
      setParsingResume(false);
    }
  };

  const handleAiParse = async (file: File) => {
    attachResumeFile(file);
    await runAiResumeParse(file);
  };

  const handleAiParseStored = async () => {
    const file = resumeFileRef.current;
    if (!file) {
      toast.message("No resume file", {
        description: "Upload a resume first, or pick a file for AI parse.",
      });
      return;
    }
    await runAiResumeParse(file);
  };

  const mergeValidationErrors = (
    values: TeacherFormValues
  ): Record<string, string> => {
    const layoutErrs = validateDynamicTeacherForm(values, formConfig);
    const zodErrs = flattenFormFieldErrors(form.formState.errors);
    return { ...zodErrs, ...layoutErrs };
  };

  const showValidationFailure = (errs: Record<string, string>) => {
    setLayoutErrors(errs);
    toast.error("Form incomplete", {
      description: formatValidationMessages(errs),
    });
  };

  const applyLayoutValidation = (values: TeacherFormValues): boolean => {
    const errs = mergeValidationErrors(values);
    if (Object.keys(errs).length > 0) {
      showValidationFailure(errs);
      return false;
    }
    return true;
  };

  const runEditSave = async () => {
    const values = sanitizeTeacherFormValues(form.getValues());
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
    async (rawValues) => {
      const values = sanitizeTeacherFormValues(rawValues);
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
    async () => {
      const values = form.getValues();
      await form.trigger();
      const errs = mergeValidationErrors(values);
      showValidationFailure(errs);
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

  const title = mode === "add" ? "Add teacher" : "Edit teacher";

  const formBody = (
    <Form {...form}>
      <div
        className={
          isPage
            ? "flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between"
            : "flex flex-col gap-4 border-b pb-4 pr-12 sm:flex-row sm:items-start sm:justify-between"
        }
      >
        {isPage ? (
          <div className="flex-1 space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">
              Complete the profile below. Upload a resume to store the file, or
              use AI parse to autofill fields.
            </p>
          </div>
        ) : (
          <SheetHeader className="flex-1 space-y-1.5 p-0 text-left">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
        )}
        <TeacherResumeActions
          fileName={resumeFileName ?? null}
          disabled={saving}
          uploadingResume={uploadingResume}
          parsingResume={parsingResume}
          onResumeUpload={handleResumeUpload}
          onAiParse={handleAiParse}
          onAiParseStored={handleAiParseStored}
          onClear={clearResumeAttachment}
        />
      </div>
      <form
        className={
          isPage
            ? "flex flex-col gap-6 pb-8"
            : "flex flex-1 flex-col gap-6 py-2"
        }
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
            isEditMode={mode === "edit"}
          />
        )}

        {isPage ? (
          <div className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-end">
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
          </div>
        ) : (
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
        )}
      </form>
    </Form>
  );

  return (
    <>
      {isPage ? (
        <div className="mx-auto w-full">{formBody}</div>
      ) : (
        <Sheet open={open} onOpenChange={requestClose}>
          <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-xl md:max-w-2xl">
            {formBody}
          </SheetContent>
        </Sheet>
      )}

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
