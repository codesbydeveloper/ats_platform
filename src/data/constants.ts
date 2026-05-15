export const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Hindi",
  "Social Science",
  "Computer Science",
  "Economics",
  "Commerce",
] as const;

export const BOARDS = [
  "CBSE",
  "ICSE",
  "IB",
  "IGCSE",
  "State Board",
  "NIOS",
] as const;

export const ROLES = [
  "Class Teacher",
  "Subject Teacher",
  "HOD",
  "Coordinator",
  "Tutor",
  "Examiner",
] as const;

export const GRADES = [
  "Grade 1–5",
  "Grade 6–8",
  "Grade 9–10",
  "Grade 11–12",
  "UG Prep",
] as const;

export const STATES = [
  "Maharashtra",
  "Karnataka",
  "Delhi",
  "Tamil Nadu",
  "Telangana",
  "Gujarat",
  "West Bengal",
  "Uttar Pradesh",
] as const;

export const CITIES: Record<string, string[]> = {
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik"],
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru"],
  Delhi: ["New Delhi", "Dwarka", "Rohini"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
  Telangana: ["Hyderabad", "Warangal"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara"],
  "West Bengal": ["Kolkata", "Howrah"],
  "Uttar Pradesh": ["Noida", "Lucknow", "Kanpur"],
};

export const SKILLS = [
  "STEM",
  "EdTech",
  "Curriculum Design",
  "Public Speaking",
  "Mentoring",
  "Assessment",
  "Special Education",
  "Research",
  "Sports",
  "Arts",
] as const;

export const EXPERIENCE_BUCKETS = [
  { label: "0–2 years", min: 0, max: 2 },
  { label: "3–5 years", min: 3, max: 5 },
  { label: "6–10 years", min: 6, max: 10 },
  { label: "10+ years", min: 11, max: 40 },
] as const;
