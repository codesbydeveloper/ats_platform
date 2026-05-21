import { STATES } from "@/data/constants";
import { SUBJECTS } from "@/data/constants";
import type { Teacher, TeacherStatus, TeacherWorkExperience } from "@/types/teacher";
import {
  normalizeExcelRow,
  type NormalizedImportRow,
} from "@/utils/teacher-excel-columns";
import { createTeacherId, uid } from "@/utils/id";

export interface ParsedRow {
  rowIndex: number;
  raw: Record<string, unknown>;
  normalized: NormalizedImportRow;
  teacher?: Teacher;
  errors: string[];
}

function splitList(v: string) {
  if (!v) return [];
  return v
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
  const parts = splitList(value);
  const primary = parts[0] ?? value;
  const found = SUBJECTS.find(
    (s) => s.toLowerCase() === primary.toLowerCase()
  );
  return found ?? primary;
}

function splitUniversities(value: string): { ug: string; pg: string } {
  const parts = splitList(value);
  if (parts.length >= 2) {
    return { ug: parts[0]!, pg: parts[1]! };
  }
  if (parts.length === 1) {
    return { ug: parts[0]!, pg: "—" };
  }
  return { ug: "—", pg: "—" };
}

export function rowToTeacher(
  raw: Record<string, unknown>,
  existing: Teacher[],
  rowIndex: number
): ParsedRow {
  const normalized = normalizeExcelRow(raw);
  const errors: string[] = [];

  const name = normalized.name;
  const email = normalized.email.toLowerCase();
  const mobile = normalized.mobile;
  const city = normalized.city;
  const state =
    normalized.state.trim() || STATES[0]!;
  const subjectsRaw = normalized.subjectsTaught;
  const statusRaw = (
    raw.status != null ? String(raw.status) : "active"
  )
    .trim()
    .toLowerCase() as TeacherStatus;

  if (!name) errors.push("NAME is required");
  if (!email || !email.includes("@")) errors.push("Valid EMAIL is required");
  if (mobile.replace(/\D/g, "").length < 10) {
    errors.push("MOBILE must be at least 10 digits");
  }
  if (!city) errors.push("CITY is required");
  if (!subjectsRaw) errors.push("SUBJECTS TAUGHT is required");

  const roles = splitList(normalized.teacherRoles);
  const grades = splitList(normalized.gradesTaught);
  const boards = splitList(normalized.boardsTaught);
  if (!roles.length) errors.push("At least one TEACHER ROLES value is required");
  if (!grades.length) errors.push("At least one GRADES TAUGHT value is required");
  if (!boards.length) errors.push("At least one BOARDS TAUGHT value is required");

  const experienceYears =
    Number(normalized.experienceYears.replace(/\D/g, "")) || 0;

  const status: TeacherStatus =
    statusRaw === "inactive" || statusRaw === "pending"
      ? statusRaw
      : "active";

  const dup = existing.some((t) => t.email.toLowerCase() === email);
  if (dup) errors.push("Duplicate EMAIL in workspace");

  if (errors.length) {
    return { rowIndex, raw, normalized, errors };
  }

  const subject = normalizeSubject(subjectsRaw);
  const { ug, pg } = splitUniversities(normalized.universitiesColleges);
  const preferred =
    normalized.preferredCities || city;
  const skills = splitList(normalized.tags);
  const contactNote = normalized.contactId
    ? `Contact ID: ${normalized.contactId}`
    : "";
  const notes = [contactNote, normalized.notes].filter(Boolean).join("\n");

  const teacher: Teacher = {
    id: createTeacherId(existing),
    name,
    email,
    mobile,
    city,
    state,
    address: normalized.address || `${city}, ${state}`,
    ugCollege: ug,
    pgUniversity: pg,
    qualification: normalized.educationalQualification || "B.Ed",
    certifications: normalized.qualificationCertification || "",
    subject,
    boards,
    grades,
    roles,
    currentLocation: city,
    preferredLocation: preferred,
    areaOfInterest: normalized.areaOfInterest || "General",
    currentSalary: Number(normalized.currentSalary.replace(/\D/g, "")) || 0,
    experienceYears,
    workHistory: [
      defaultWork(normalized.schoolName || "Imported record"),
    ],
    resumeFileName: normalized.resume || null,
    resumeMime: null,
    notes,
    status,
    skills: skills.length ? skills : ["General"],
    createdAt: new Date().toISOString(),
  };

  return { rowIndex, raw, normalized, teacher, errors: [] };
}
