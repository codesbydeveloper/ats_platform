export type TeacherStatus = "active" | "inactive" | "pending";

export interface TeacherWorkExperience {
  id: string;
  schoolName: string;
  role: string;
  from: string;
  to: string | null;
  currentlyWorking: boolean;
}

export interface Teacher {
  /** Numeric or primary key for API routes (`/api/teachers/:id`). */
  id: string;
  /** Human-readable code from API (`teacher_id`, e.g. TCH-00005). */
  teacherCode?: string | null;
  name: string;
  email: string;
  mobile: string;
  city: string;
  state: string;
  country: string;
  address: string;
  ugCollege: string;
  pgUniversity: string;
  qualification: string;
  certifications: string;
  /** Optional extra education lines from API (`additional_education`). */
  extraEducation?: string[];
  subject: string;
  boards: string[];
  grades: string[];
  roles: string[];
  currentLocation: string;
  preferredLocation: string;
  areaOfInterest: string;
  currentSalary: number;
  experienceYears: number;
  workHistory: TeacherWorkExperience[];
  resumeFileName: string | null;
  /** Public or storage URL for opening resume in browser. */
  resumeUrl?: string | null;
  resumeMime: string | null;
  notes: string;
  status: TeacherStatus;
  skills: string[];
  customFields?: Record<string, string | number | boolean | string[]>;
  createdAt: string;
}

export type TeacherDraft = Partial<Teacher> & {
  workHistory?: TeacherWorkExperience[];
};
