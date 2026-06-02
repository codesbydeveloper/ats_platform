import * as XLSX from "xlsx";

import type { Teacher } from "@/types/teacher";
import type { TeacherFormOptionsMap } from "@/lib/teacher-form-options";
import {
  buildTemplateSampleRow,
  TEACHER_EXCEL_HEADERS,
  teacherToExcelRow,
} from "@/utils/teacher-excel-columns";

function sheetFromTeachers(teachers: Teacher[]) {
  const rows = teachers.map((t) => teacherToExcelRow(t));
  return XLSX.utils.json_to_sheet(rows, {
    header: [...TEACHER_EXCEL_HEADERS],
  });
}

export function exportTeachersXlsx(
  teachers: Teacher[],
  filename: string,
  options?: TeacherFormOptionsMap
) {
  const sheet = sheetFromTeachers(teachers);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Teachers");
  appendTeacherLookupSheets(book, options);
  XLSX.writeFile(book, `${filename}.xlsx`);
}

export function exportTeachersCsv(teachers: Teacher[], filename: string) {
  const sheet = sheetFromTeachers(teachers);
  const csv = XLSX.utils.sheet_to_csv(sheet);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function addListSheet(book: XLSX.WorkBook, name: string, header: string, values: string[]) {
  const rows = [[header], ...values.map((v) => [v])];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  // Replace existing sheet if present (so we can decorate server-exported workbooks).
  book.Sheets[name] = sheet;
  if (!book.SheetNames.includes(name)) {
    book.SheetNames.push(name);
  }
}

export function appendTeacherLookupSheets(
  book: XLSX.WorkBook,
  options?: TeacherFormOptionsMap
): void {
  const bySlug = options?.bySlug ?? {};
  addListSheet(
    book,
    "Educational Qualification",
    "EDUCATIONAL QUALIFICATION",
    bySlug["educational-qualification"] ?? []
  );
  addListSheet(
    book,
    "Qualification Certification",
    "QUALIFICATION CERTIFICATION",
    bySlug["qualification-certification"] ?? []
  );
  addListSheet(book, "Subjects Taught", "SUBJECTS TAUGHT", bySlug["subjects-taught"] ?? []);
  addListSheet(book, "Grades Taught", "GRADES TAUGHT", bySlug["grades-taught"] ?? []);
  addListSheet(book, "Boards Taught", "BOARDS TAUGHT", bySlug["boards-taught"] ?? []);
  addListSheet(book, "Teacher Roles", "TEACHER ROLES", bySlug["teacher-roles"] ?? []);
}

export function buildSampleTemplateWorkbook(options?: TeacherFormOptionsMap) {
  const sheet = XLSX.utils.json_to_sheet([buildTemplateSampleRow()], {
    header: [...TEACHER_EXCEL_HEADERS],
  });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Teachers");
  appendTeacherLookupSheets(book, options);

  return book;
}
