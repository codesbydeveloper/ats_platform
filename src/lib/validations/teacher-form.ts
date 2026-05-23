import { z } from "zod";

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
  name: z.string(),
  mobile: z.string(),
  email: z.string(),
  state: z.string(),
  city: z.string(),
  address: z.string(),
  ugCollege: z.string(),
  pgUniversity: z.string(),
  qualification: z.string(),
  certifications: z.string().optional(),
  extraEducation: z.array(extraEducationSchema).optional(),
  subject: z.string(),
  boards: z.array(z.string()),
  grades: z.array(z.string()),
  roles: z.array(z.string()),
  currentLocation: z.string(),
  preferredLocation: z.string(),
  areaOfInterest: z.string(),
  currentSalary: z.coerce.number(),
  experienceYears: z.coerce.number(),
  status: z.enum(["active", "inactive", "pending"]),
  workHistory: z.array(workSchema),
  resumeFileName: z.string().nullable(),
  resumeMime: z.string().nullable(),
  notes: z.string().optional(),
  skills: z.array(z.string()).optional(),
  customFields: z
    .record(
      z.string(),
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.string()),
      ])
    )
    .optional(),
});

export type TeacherFormValues = z.infer<typeof teacherFormSchema>;

export function emptyTeacherFormValues(): TeacherFormValues {
  return {
    name: "",
    mobile: "",
    email: "",
    state: "",
    city: "",
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
