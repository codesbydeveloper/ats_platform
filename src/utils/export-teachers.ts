import * as XLSX from "xlsx";

import type { Teacher } from "@/types/teacher";

function rowFromTeacher(t: Teacher) {
  return {
    id: t.id,
    name: t.name,
    email: t.email,
    mobile: t.mobile,
    city: t.city,
    state: t.state,
    subject: t.subject,
    roles: t.roles.join("; "),
    grades: t.grades.join("; "),
    boards: t.boards.join("; "),
    experienceYears: t.experienceYears,
    resumeFileName: t.resumeFileName ?? "",
    status: t.status,
    createdAt: t.createdAt,
    skills: t.skills.join("; "),
  };
}

export function exportTeachersXlsx(teachers: Teacher[], filename: string) {
  const rows = teachers.map(rowFromTeacher);
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Teachers");
  XLSX.writeFile(book, `${filename}.xlsx`);
}

export function exportTeachersCsv(teachers: Teacher[], filename: string) {
  const rows = teachers.map(rowFromTeacher);
  const sheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(sheet);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildSampleTemplateWorkbook() {
  const sample = [
    {
      name: "Sample Teacher",
      email: "sample.teacher@example.com",
      mobile: "9876543210",
      city: "Bengaluru",
      state: "Karnataka",
      subject: "Mathematics",
      roles: "Subject Teacher",
      grades: "Grade 9–10",
      boards: "CBSE",
      experienceYears: 4,
      status: "active",
    },
  ];
  const sheet = XLSX.utils.json_to_sheet(sample);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Teachers");
  return book;
}
