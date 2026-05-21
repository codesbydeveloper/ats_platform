import * as XLSX from "xlsx";

import type { Teacher } from "@/types/teacher";
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

export function exportTeachersXlsx(teachers: Teacher[], filename: string) {
  const sheet = sheetFromTeachers(teachers);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Teachers");
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

export function buildSampleTemplateWorkbook() {
  const sheet = XLSX.utils.json_to_sheet([buildTemplateSampleRow()], {
    header: [...TEACHER_EXCEL_HEADERS],
  });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Teachers");
  return book;
}
