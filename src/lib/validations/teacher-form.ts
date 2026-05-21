import { z } from "zod";

const extraEducationSchema = z.object({
  id: z.string(),
  value: z.string(),
});

const workSchema = z.object({
  id: z.string(),
  schoolName: z.string().min(1, "School name is required"),
  role: z.string().min(1, "Role is required"),
  from: z.string().min(1, "Start date is required"),
  to: z.string().nullable(),
  currentlyWorking: z.boolean(),
});

export const teacherFormSchema = z
  .object({
    name: z.string().min(2, "Name is required"),
    mobile: z
      .string()
      .min(10, "Enter a valid mobile")
      .regex(/^[0-9+\-\s]{10,15}$/, "Invalid mobile"),
    email: z.string().email("Invalid email"),
    state: z.string().min(1, "State is required"),
    city: z.string().min(1, "City is required"),
    address: z.string().min(4, "Address is required"),
    ugCollege: z.string().min(2, "UG college is required"),
    pgUniversity: z.string().min(2, "PG university is required"),
    qualification: z.string().min(2, "Qualification is required"),
    certifications: z.string().optional(),
    /** One free-text line per “Add more” click under Educational details. */
    extraEducation: z.array(extraEducationSchema).optional(),
    subject: z.string().min(1, "Subject is required"),
    boards: z.array(z.string()).min(1, "Select at least one board"),
    grades: z.array(z.string()).min(1, "Select at least one grade band"),
    roles: z.array(z.string()).min(1, "Select at least one role"),
    currentLocation: z.string().min(2, "Required"),
    preferredLocation: z.string().min(2, "Required"),
    areaOfInterest: z.string().min(2, "Required"),
    currentSalary: z.coerce.number().min(0, "Must be positive"),
    experienceYears: z.coerce.number().min(0).max(50),
    status: z.enum(["active", "inactive", "pending"]),
    workHistory: z.array(workSchema).min(1, "Add at least one role"),
    resumeFileName: z.string().nullable(),
    resumeMime: z.string().nullable(),
    notes: z.string().optional(),
    skills: z.array(z.string()).optional(),
  })
  .refine(
    (data) =>
      data.workHistory.every(
        (w) => w.currentlyWorking || (!!w.to && w.to.length > 0)
      ),
    {
      message: "Provide end date or mark as currently working",
      path: ["workHistory"],
    }
  );

export type TeacherFormValues = z.infer<typeof teacherFormSchema>;
