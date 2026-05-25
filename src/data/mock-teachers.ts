import type { Teacher, TeacherStatus, TeacherWorkExperience } from "@/types/teacher";
import { BOARDS, GRADES, ROLES, SKILLS, SUBJECTS } from "@/data/constants";
import { getCitiesForIndianState, getIndianStates } from "@/lib/india-locations";
import { DEFAULT_COUNTRY_NAME } from "@/lib/locations";

const firstNames = [
  "Aarav",
  "Vihaan",
  "Aditya",
  "Ananya",
  "Isha",
  "Kavya",
  "Rohan",
  "Sneha",
  "Dev",
  "Meera",
  "Kabir",
  "Priya",
  "Arjun",
  "Neha",
  "Siddharth",
  "Riya",
  "Manish",
  "Pooja",
  "Nikhil",
  "Divya",
  "Suresh",
  "Lakshmi",
  "Harish",
  "Anjali",
  "Vikram",
  "Shreya",
  "Karan",
  "Tanya",
  "Rahul",
  "Swati",
];

const lastNames = [
  "Sharma",
  "Verma",
  "Patel",
  "Iyer",
  "Reddy",
  "Singh",
  "Khan",
  "Das",
  "Nair",
  "Mehta",
  "Joshi",
  "Kapoor",
  "Malhotra",
  "Choudhary",
  "Banerjee",
  "Ghosh",
  "Menon",
  "Pillai",
  "Rao",
  "Kulkarni",
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function padId(n: number) {
  return `TCH-${String(n).padStart(5, "0")}`;
}

function randomDateWithinYears(yearsAgo: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - yearsAgo);
  d.setMonth(Math.floor(Math.random() * 12));
  d.setDate(Math.floor(Math.random() * 28) + 1);
  return d.toISOString();
}

function buildWorkHistory(): TeacherWorkExperience[] {
  const count = Math.floor(Math.random() * 2) + 1;
  const items: TeacherWorkExperience[] = [];
  for (let i = 0; i < count; i++) {
    const current = i === 0 && Math.random() > 0.5;
    items.push({
      id: `wh-${Math.random().toString(36).slice(2)}`,
      schoolName: `${pick(["Greenwood", "Riverside", "Heritage", "Oakridge", "Summit"])} ${pick(["Academy", "International", "High School", "Public School"])}`,
      role: pick(ROLES),
      from: randomDateWithinYears(6 + i * 2),
      to: current ? null : randomDateWithinYears(2 + i),
      currentlyWorking: current,
    });
  }
  return items;
}

export function generateMockTeachers(count = 55): Teacher[] {
  const teachers: Teacher[] = [];
  for (let i = 1; i <= count; i++) {
    const state = pick(getIndianStates());
    const cityList = getCitiesForIndianState(state);
    const city = cityList.length ? pick(cityList) : "—";
    const fn = pick(firstNames);
    const ln = pick(lastNames);
    const subject = pick(SUBJECTS);
    const status: TeacherStatus =
      Math.random() > 0.85 ? "pending" : Math.random() > 0.12 ? "active" : "inactive";
    const boards = [pick(BOARDS), ...(Math.random() > 0.6 ? [pick(BOARDS)] : [])].filter(
      (b, idx, a) => a.indexOf(b) === idx
    );
    const grades = [pick(GRADES), ...(Math.random() > 0.5 ? [pick(GRADES)] : [])].filter(
      (g, idx, a) => a.indexOf(g) === idx
    );
    const roles = [pick(ROLES), ...(Math.random() > 0.65 ? [pick(ROLES)] : [])].filter(
      (r, idx, a) => a.indexOf(r) === idx
    );
    const skills = SKILLS.filter(() => Math.random() > 0.7).slice(0, 4);
    const exp = Math.floor(Math.random() * 18) + 1;
    const hasResume = Math.random() > 0.15;
    teachers.push({
      id: padId(i),
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`,
      mobile: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
      city,
      state,
      country: DEFAULT_COUNTRY_NAME,
      address: `${Math.floor(Math.random() * 200) + 1} ${pick(["Lake View", "Park Avenue", "Civil Lines"])} Rd`,
      ugCollege: pick(["St. Xavier", "Miranda", "Hansraj", "Christ University", "Fergusson"]),
      pgUniversity: pick(["IIT", "DU", "JNU", "TISS", "IGNOU", "State University"]),
      qualification: pick(["B.Ed", "M.Ed", "M.Sc", "M.A", "Ph.D"]),
      certifications: pick(["CTET", "NET", "TEFL", "Google Educator", "None"]),
      subject,
      boards,
      grades,
      roles,
      currentLocation: `${city}, ${state}`,
      preferredLocation: pick([`${city}, ${state}`, "Remote", "Hybrid Metro"]),
      areaOfInterest: pick(["STEM Labs", "Literacy", "Competitive Exams", "Inclusive Ed"]),
      currentSalary: Math.floor(35000 + Math.random() * 90000),
      experienceYears: exp,
      workHistory: buildWorkHistory(),
      resumeFileName: hasResume
        ? `${fn}_${ln}_Resume.${pick(["pdf", "docx"])}`
        : null,
      resumeMime: hasResume ? "application/pdf" : null,
      notes: pick([
        "Strong classroom management.",
        "Prefers morning batches.",
        "Open to relocation Q3.",
        "",
      ]),
      status,
      skills: skills.length ? skills : [pick(SKILLS)],
      createdAt: randomDateWithinYears(Math.floor(Math.random() * 3)),
    });
  }
  return teachers;
}
