/** Header account menu → lookup pages for category option lists. */
export type LookupMenuSlug =
  | "educational-qualification"
  | "qualification-certification"
  | "subjects-taught"
  | "boards-taught"
  | "grades-taught"
  | "state-wise"
  | "city-wise"
  | "area-of-interest"
  | "teacher-roles";

/** How this field appears on the Add / Edit teacher form. */
export type LookupFieldDisplay = "chips" | "dropdown" | "text-options";

export interface LookupMenuItem {
  slug: LookupMenuSlug;
  label: string;
  /** Substrings to match a top-level category name from the API (case-insensitive). */
  match: string[];
  /** Visual style — matches teacher form controls for this field. */
  display: LookupFieldDisplay;
  /** Short note shown on the field settings page. */
  formHint: string;
}

export const LOOKUP_MENU_ITEMS: LookupMenuItem[] = [
  {
    slug: "educational-qualification",
    label: "Educational Qualification",
    match: ["educational qualification", "educational"],
    display: "text-options",
    formHint: "Choices teachers can pick for educational qualification.",
  },
  {
    slug: "qualification-certification",
    label: "Qualification / Certification",
    match: ["qualification / certification", "qualification", "certification"],
    display: "text-options",
    formHint: "Certification and qualification options on the teacher form.",
  },
  {
    slug: "subjects-taught",
    label: "Subjects Taught",
    match: ["subjects taught", "subject"],
    display: "dropdown",
    formHint: "Shown as a dropdown when adding or editing a teacher.",
  },
  {
    slug: "boards-taught",
    label: "Boards Taught",
    match: ["boards taught", "board"],
    display: "chips",
    formHint: "Shown as selectable chips under Teaching details.",
  },
  {
    slug: "grades-taught",
    label: "Grades Taught",
    match: ["grades taught", "grade"],
    display: "chips",
    formHint: "Shown as selectable chips under Teaching details.",
  },
  {
    slug: "state-wise",
    label: "State Wise",
    match: ["state wise", "state", "states"],
    display: "dropdown",
    formHint: "States shown on the teacher form (personal details).",
  },
  {
    slug: "city-wise",
    label: "City Wise",
    match: ["city wise", "city", "cities"],
    display: "dropdown",
    formHint: "Cities shown on the teacher form (personal details).",
  },
  {
    slug: "area-of-interest",
    label: "Area Of Interest",
    match: ["area of interest", "interest"],
    display: "text-options",
    formHint: "Interest areas teachers can choose on the form.",
  },
  {
    slug: "teacher-roles",
    label: "Teacher Roles",
    match: ["teacher roles", "role"],
    display: "chips",
    formHint: "Shown as selectable chips — same as Teacher roles on Add teacher.",
  },
];

export function getLookupMenuItem(
  slug: string | undefined
): LookupMenuItem | undefined {
  if (!slug) return undefined;
  return LOOKUP_MENU_ITEMS.find((item) => item.slug === slug);
}
