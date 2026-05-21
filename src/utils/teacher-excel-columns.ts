import type { Teacher } from "@/types/teacher";

/** Column order for import template, export, and API file upload. */
export const TEACHER_EXCEL_HEADERS = [
  "CONTACT ID",
  "NAME",
  "MOBILE",
  "EMAIL",
  "CITY",
  "PREFERRED CITIES",
  "UNIVERSITIES / COLLEGES ATTENDED",
  "EDUCATIONAL QUALIFICATION",
  "SUBJECTS TAUGHT",
  "TAGS",
  "QUALIFICATION CERTIFICATION",
  "GRADES TAUGHT",
  "BOARDS TAUGHT",
  "NOTES",
  "TEACHER ROLES",
  "Resume",
] as const;

export type TeacherExcelHeader = (typeof TEACHER_EXCEL_HEADERS)[number];

export type NormalizedImportRow = {
  contactId: string;
  name: string;
  mobile: string;
  email: string;
  city: string;
  preferredCities: string;
  universitiesColleges: string;
  educationalQualification: string;
  subjectsTaught: string;
  tags: string;
  qualificationCertification: string;
  gradesTaught: string;
  boardsTaught: string;
  notes: string;
  teacherRoles: string;
  resume: string;
  /** Legacy / extra columns */
  state: string;
  address: string;
  experienceYears: string;
  currentSalary: string;
  areaOfInterest: string;
  schoolName: string;
};

function normHeader(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/_/g, " ");
}

const ALIAS_TO_FIELD: Record<string, keyof NormalizedImportRow> = {
  "contact id": "contactId",
  "contactid": "contactId",
  id: "contactId",

  name: "name",
  mobile: "mobile",
  phone: "mobile",
  email: "email",
  city: "city",
  "preferred cities": "preferredCities",
  "preferred location": "preferredCities",
  preferredlocation: "preferredCities",
  "universities / colleges attended": "universitiesColleges",
  "universities colleges attended": "universitiesColleges",
  universities: "universitiesColleges",
  ugcollege: "universitiesColleges",
  "ug college": "universitiesColleges",
  "educational qualification": "educationalQualification",
  qualification: "educationalQualification",
  "subjects taught": "subjectsTaught",
  subject: "subjectsTaught",
  subjects: "subjectsTaught",
  tags: "tags",
  skills: "tags",
  "qualification certification": "qualificationCertification",
  "qualification / certification": "qualificationCertification",
  certifications: "qualificationCertification",
  "grades taught": "gradesTaught",
  grades: "gradesTaught",
  "boards taught": "boardsTaught",
  boards: "boardsTaught",
  notes: "notes",
  "teacher roles": "teacherRoles",
  roles: "teacherRoles",
  role: "teacherRoles",
  resume: "resume",
  resumefilename: "resume",
  "resume file": "resume",

  state: "state",
  address: "address",
  "experience years": "experienceYears",
  experienceyears: "experienceYears",
  "total experience": "experienceYears",
  "current salary": "currentSalary",
  currentsalary: "currentSalary",
  "area of interest": "areaOfInterest",
  areaofinterest: "areaOfInterest",
  "school name": "schoolName",
  schoolname: "schoolName",
};

function emptyNormalized(): NormalizedImportRow {
  return {
    contactId: "",
    name: "",
    mobile: "",
    email: "",
    city: "",
    preferredCities: "",
    universitiesColleges: "",
    educationalQualification: "",
    subjectsTaught: "",
    tags: "",
    qualificationCertification: "",
    gradesTaught: "",
    boardsTaught: "",
    notes: "",
    teacherRoles: "",
    resume: "",
    state: "",
    address: "",
    experienceYears: "",
    currentSalary: "",
    areaOfInterest: "",
    schoolName: "",
  };
}

/** Map spreadsheet headers (any casing) to our import shape. */
export function normalizeExcelRow(
  raw: Record<string, unknown>
): NormalizedImportRow {
  const out = emptyNormalized();
  for (const [key, value] of Object.entries(raw)) {
    const field = ALIAS_TO_FIELD[normHeader(key)];
    if (field && value != null && String(value).trim() !== "") {
      out[field] = String(value).trim();
    }
  }
  return out;
}

export function teacherToExcelRow(
  t: Teacher,
  contactId?: string
): Record<TeacherExcelHeader, string | number> {
  const uni = [t.ugCollege, t.pgUniversity]
    .filter((s) => s && s !== "—")
    .join("; ");
  let notesOut = t.notes ?? "";
  const contactFromNotes = notesOut.match(/^Contact ID:\s*(.+)$/m)?.[1]?.trim();
  const displayContactId = contactId ?? contactFromNotes ?? t.id;
  if (notesOut.startsWith("Contact ID:")) {
    notesOut = notesOut.replace(/^Contact ID:\s*.+\n?/, "").trim();
  }
  return {
    "CONTACT ID": displayContactId,
    NAME: t.name,
    MOBILE: t.mobile,
    EMAIL: t.email,
    CITY: t.city,
    "PREFERRED CITIES": t.preferredLocation,
    "UNIVERSITIES / COLLEGES ATTENDED": uni || t.ugCollege,
    "EDUCATIONAL QUALIFICATION": t.qualification,
    "SUBJECTS TAUGHT": t.subject,
    TAGS: t.skills.join("; "),
    "QUALIFICATION CERTIFICATION": t.certifications,
    "GRADES TAUGHT": t.grades.join("; "),
    "BOARDS TAUGHT": t.boards.join("; "),
    NOTES: notesOut,
    "TEACHER ROLES": t.roles.join("; "),
    Resume: t.resumeFileName ?? "",
  };
}

export function buildTemplateSampleRow(): Record<TeacherExcelHeader, string> {
  return {
    "CONTACT ID": "T-001",
    NAME: "Sample Teacher",
    MOBILE: "9876543210",
    EMAIL: "sample.teacher@example.com",
    CITY: "Mumbai",
    "PREFERRED CITIES": "Mumbai; Pune",
    "UNIVERSITIES / COLLEGES ATTENDED": "Example UG College; Example PG University",
    "EDUCATIONAL QUALIFICATION": "B.Ed",
    "SUBJECTS TAUGHT": "Mathematics",
    TAGS: "STEM; CBSE",
    "QUALIFICATION CERTIFICATION": "CTET",
    "GRADES TAUGHT": "Grade 9–10",
    "BOARDS TAUGHT": "CBSE",
    NOTES: "Imported via template",
    "TEACHER ROLES": "Subject Teacher",
    Resume: "sample_resume.pdf",
  };
}
