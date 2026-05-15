import { SUBJECTS } from "@/data/constants";
import type { Teacher, TeacherStatus, TeacherWorkExperience } from "@/types/teacher";
import { createTeacherId, uid } from "@/utils/id";

export interface ParsedRow {
  rowIndex: number;
  raw: Record<string, unknown>;
  teacher?: Teacher;
  errors: string[];
}

function asString(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function splitList(v: unknown) {
  const s = asString(v);
  if (!s) return [];
  return s
    .split(/[;,]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function defaultWork(schoolName: string): TeacherWorkExperience {
  return {
    id: uid("work"),
    schoolName,
    role: "Subject Teacher",
    from: new Date().toISOString().slice(0, 10),
    to: null,
    currentlyWorking: true,
  };
}

function normalizeSubject(value: string) {
  const found = SUBJECTS.find(
    (s) => s.toLowerCase() === value.toLowerCase()
  );
  return found ?? value;
}

export function rowToTeacher(
  raw: Record<string, unknown>,
  existing: Teacher[],
  rowIndex: number
): ParsedRow {
  const errors: string[] = [];
  const name = asString(raw.name);
  const email = asString(raw.email).toLowerCase();
  const mobile = asString(raw.mobile);
  const city = asString(raw.city);
  const state = asString(raw.state);
  const subjectRaw = asString(raw.subject);
  const statusRaw = asString(raw.status).toLowerCase() as TeacherStatus;

  if (!name) errors.push("Name is required");
  if (!email || !email.includes("@")) errors.push("Valid email is required");
  if (mobile.replace(/\D/g, "").length < 10) {
    errors.push("Mobile must be at least 10 digits");
  }
  if (!city) errors.push("City is required");
  if (!state) errors.push("State is required");
  if (!subjectRaw) errors.push("Subject is required");

  const roles = splitList(raw.roles);
  const grades = splitList(raw.grades);
  const boards = splitList(raw.boards);
  if (!roles.length) errors.push("At least one role is required");
  if (!grades.length) errors.push("At least one grade band is required");
  if (!boards.length) errors.push("At least one board is required");

  const experienceYears = Number(asString(raw.experienceYears)) || 0;

  const status: TeacherStatus =
    statusRaw === "inactive" || statusRaw === "pending"
      ? statusRaw
      : "active";

  const dup = existing.some((t) => t.email.toLowerCase() === email);
  if (dup) errors.push("Duplicate email in workspace");

  if (errors.length) {
    return { rowIndex, raw, errors };
  }

  const subject = normalizeSubject(subjectRaw);

  const teacher: Teacher = {
    id: createTeacherId(existing),
    name,
    email,
    mobile,
    city,
    state,
    address: asString(raw.address) || `${city}, ${state}`,
    ugCollege: asString(raw.ugCollege) || "—",
    pgUniversity: asString(raw.pgUniversity) || "—",
    qualification: asString(raw.qualification) || "B.Ed",
    certifications: asString(raw.certifications) || "",
    subject,
    boards,
    grades,
    roles,
    currentLocation: asString(raw.currentLocation) || `${city}, ${state}`,
    preferredLocation:
      asString(raw.preferredLocation) ||
      asString(raw.currentLocation) ||
      city,
    areaOfInterest: asString(raw.areaOfInterest) || "General",
    currentSalary: Number(asString(raw.currentSalary)) || 0,
    experienceYears,
    workHistory: [
      defaultWork(asString(raw.schoolName) || "Imported record"),
    ],
    resumeFileName: asString(raw.resumeFileName) || null,
    resumeMime: null,
    notes: asString(raw.notes) || "",
    status,
    skills: splitList(raw.skills).length ? splitList(raw.skills) : ["STEM"],
    createdAt: new Date().toISOString(),
  };

  return { rowIndex, raw, teacher, errors: [] };
}
