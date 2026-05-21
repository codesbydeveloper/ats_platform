import { mapApiRowToTeacher } from "@/lib/teachers-api";
import type { TeacherFormValues } from "@/lib/validations/teacher-form";
import type { TeacherWorkExperience } from "@/types/teacher";

function unwrapRecord(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  return data as Record<string, unknown>;
}

function hasMeaningfulText(value: string | undefined): value is string {
  if (!value) return false;
  const t = value.trim();
  return t.length > 0 && t !== "—" && t !== "Unknown";
}

function workIsPlaceholder(work: TeacherWorkExperience[]): boolean {
  return (
    work.length === 1 &&
    work[0]!.schoolName === "—" &&
    work[0]!.role === "—"
  );
}

/** Unwrap common parse-resume response envelopes. */
export function unwrapParseResumePayload(data: unknown): Record<string, unknown> | null {
  const root = unwrapRecord(data);
  if (!root) return null;

  const candidates: unknown[] = [
    root,
    root.data,
    root.parsed,
    root.teacher,
    root.result,
  ];

  const dataRec = unwrapRecord(root.data);
  if (dataRec) {
    candidates.push(dataRec.parsed, dataRec.teacher, dataRec.result);
  }

  for (const c of candidates) {
    const rec = unwrapRecord(c);
    if (!rec) continue;
    const keys = [
      "name",
      "full_name",
      "email",
      "mobile",
      "phone",
      "subject",
      "subject_taught",
      "qualification",
    ];
    if (keys.some((k) => rec[k] != null && String(rec[k]).trim() !== "")) {
      return rec;
    }
  }

  return root;
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Map parse-resume JSON into form fields (does not set resume file metadata). */
export function parsedResumeToFormPatch(
  data: unknown
): Partial<TeacherFormValues> {
  const row = unwrapParseResumePayload(data);
  if (!row) return {};

  const mapped = mapApiRowToTeacher({ ...row, id: "__parse__" });
  if (!mapped) return {};

  const patch: Partial<TeacherFormValues> = {};

  if (hasMeaningfulText(mapped.name)) patch.name = mapped.name;
  if (hasMeaningfulText(mapped.email)) patch.email = mapped.email;
  if (hasMeaningfulText(mapped.mobile)) patch.mobile = mapped.mobile;
  if (hasMeaningfulText(mapped.state)) patch.state = mapped.state;
  if (hasMeaningfulText(mapped.city)) patch.city = mapped.city;
  if (hasMeaningfulText(mapped.address)) patch.address = mapped.address;
  if (hasMeaningfulText(mapped.ugCollege)) patch.ugCollege = mapped.ugCollege;
  if (hasMeaningfulText(mapped.pgUniversity))
    patch.pgUniversity = mapped.pgUniversity;
  if (hasMeaningfulText(mapped.qualification))
    patch.qualification = mapped.qualification;
  if (mapped.certifications.trim()) patch.certifications = mapped.certifications;
  if (hasMeaningfulText(mapped.subject)) patch.subject = mapped.subject;
  if (mapped.boards.length > 0) patch.boards = mapped.boards;
  if (mapped.grades.length > 0) patch.grades = mapped.grades;
  if (mapped.roles.length > 0) patch.roles = mapped.roles;
  if (hasMeaningfulText(mapped.currentLocation))
    patch.currentLocation = mapped.currentLocation;
  if (hasMeaningfulText(mapped.preferredLocation))
    patch.preferredLocation = mapped.preferredLocation;
  if (hasMeaningfulText(mapped.areaOfInterest))
    patch.areaOfInterest = mapped.areaOfInterest;
  if (mapped.currentSalary > 0) patch.currentSalary = mapped.currentSalary;
  if (mapped.experienceYears > 0)
    patch.experienceYears = mapped.experienceYears;
  if (mapped.notes.trim()) patch.notes = mapped.notes;
  if (mapped.skills.length > 0) patch.skills = mapped.skills;

  if ((mapped.extraEducation ?? []).length > 0) {
    patch.extraEducation = mapped.extraEducation!.map((value) => ({
      id: uid("edu-extra"),
      value,
    }));
  }

  if (!workIsPlaceholder(mapped.workHistory)) {
    patch.workHistory = mapped.workHistory.map((w) => ({
      id: w.id.startsWith("w-") ? uid("work") : w.id,
      schoolName: w.schoolName,
      role: w.role,
      from: w.from.slice(0, 10),
      to: w.to ? w.to.slice(0, 10) : null,
      currentlyWorking: w.currentlyWorking,
    }));
  }

  return patch;
}
