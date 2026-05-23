/** Field types returned by GET /api/teacher-form */
export type ApiTeacherFormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "tel"
  | "select"
  | "multiselect"
  | "date"
  | "boolean"
  | "work_experience";

export interface ApiTeacherFormField {
  id: string;
  key: string;
  label: string;
  type: ApiTeacherFormFieldType;
  required?: boolean;
  sortOrder?: number;
  options?: string[];
  sectionId?: string;
  /** System fields cannot be deleted on the backend. */
  system?: boolean;
  deletable?: boolean;
}

export interface ApiTeacherFormSection {
  id: string;
  title: string;
  description?: string | null;
  sortOrder?: number;
  system?: boolean;
  deletable?: boolean;
  fields: ApiTeacherFormField[];
}

export interface ApiTeacherFormConfig {
  sections: ApiTeacherFormSection[];
  updatedAt?: string;
}

export type CreateTeacherFormSectionInput = {
  title: string;
  description?: string;
  id?: string;
  sortOrder?: number;
};

export type UpdateTeacherFormSectionInput = Partial<{
  title: string;
  description: string | null;
  sortOrder: number;
}>;

export type CreateTeacherFormFieldInput = {
  label: string;
  key: string;
  type: ApiTeacherFormFieldType;
  required?: boolean;
  options?: string[];
  sortOrder?: number;
};

export type UpdateTeacherFormFieldInput = Partial<{
  label: string;
  type: ApiTeacherFormFieldType;
  required: boolean;
  options: string[];
  sortOrder: number;
  sectionId: string;
}>;
