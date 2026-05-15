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
  id: string;
  name: string;
  email: string;
  mobile: string;
  city: string;
  state: string;
  address: string;
  ugCollege: string;
  pgUniversity: string;
  qualification: string;
  certifications: string;
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
  resumeMime: string | null;
  notes: string;
  status: TeacherStatus;
  skills: string[];
  createdAt: string;
}

export type TeacherDraft = Partial<Teacher> & {
  workHistory?: TeacherWorkExperience[];
};
