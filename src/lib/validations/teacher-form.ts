import { z } from "zod";

import {
  getDefaultCityForState,
  getDefaultCountryName,
  getDefaultStateForCountry,
} from "@/lib/locations";
import { parseMultiselectStoredValue } from "@/lib/multiselect-form-value";

function coerceStringArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.map(String).map((s) => s.trim()).filter(Boolean);
  }
  return parseMultiselectStoredValue(val);
}

function coerceOptionalNumber(val: unknown): number {
  if (val === "" || val === null || val === undefined) return 0;
  const n = typeof val === "number" ? val : Number(val);
  return Number.isFinite(n) ? n : 0;
}

/** Letters, spaces, and common name punctuation only. */
const NAME_PATTERN = /^[a-zA-Z\s.'-]+$/;

const extraEducationSchema = z.object({
  id: z.string(),
  value: z.string(),
});

const workSchema = z.object({
  id: z.string(),
  schoolName: z.string(),
  role: z.string(),
  from: z.string(),
  to: z.string().nullable(),
  currentlyWorking: z.boolean(),
});

/** Permissive schema — required rules come from GET /api/teacher-form. */
export const teacherFormSchema = z.object({
  name: z
    .string()
    .refine(
      (val) => val.trim() === "" || NAME_PATTERN.test(val.trim()),
      "Name can only contain letters"
    ),
  mobile: z
    .string()
    .refine(
      (val) => val.trim() === "" || /^\d+$/.test(val.replace(/\s/g, "")),
      "Mobile must contain numbers only"
    ),
  email: z
    .string()
    .refine(
      (val) =>
        val.trim() === "" || z.string().email().safeParse(val.trim()).success,
      "Enter a valid email address"
    ),
  country: z.string(),
  state: z.string(),
  city: z.string(),
  address: z.string(),
  ugCollege: z.string(),
  pgUniversity: z.string(),
  qualification: z.string(),
  certifications: z.string().optional(),
  extraEducation: z.array(extraEducationSchema).optional(),
  subject: z.string(),
  boards: z.preprocess(coerceStringArray, z.array(z.string())),
  grades: z.preprocess(coerceStringArray, z.array(z.string())),
  roles: z.preprocess(coerceStringArray, z.array(z.string())),
  currentLocation: z.string(),
  preferredLocation: z.string(),
  areaOfInterest: z.string(),
  currentSalary: z.preprocess(coerceOptionalNumber, z.number()),
  experienceYears: z.preprocess(coerceOptionalNumber, z.number()),
  status: z.enum(["active", "inactive", "pending"]),
  workHistory: z.array(workSchema).default([]),
  resumeFileName: z.string().nullable(),
  resumeMime: z.string().nullable(),
  notes: z.string().optional(),
  skills: z.preprocess(coerceStringArray, z.array(z.string())).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export type TeacherFormValues = z.infer<typeof teacherFormSchema>;

export function emptyTeacherFormValues(): TeacherFormValues {
  const country = getDefaultCountryName();
  const state = getDefaultStateForCountry(country);
  const city = getDefaultCityForState(country, state);
  return {
    name: "",
    mobile: "",
    email: "",
    country,
    state,
    city,
    address: "",
    ugCollege: "",
    pgUniversity: "",
    qualification: "",
    certifications: "",
    extraEducation: [],
    subject: "",
    boards: [],
    grades: [],
    roles: [],
    currentLocation: "",
    preferredLocation: "",
    areaOfInterest: "",
    currentSalary: 0,
    experienceYears: 0,
    status: "active",
    workHistory: [],
    resumeFileName: null,
    resumeMime: null,
    notes: "",
    skills: [],
    customFields: {},
  };
}
