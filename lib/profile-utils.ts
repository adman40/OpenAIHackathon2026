import type {
  CareerGoal,
  CompletedCourse,
  StudentProfile,
} from "./types";

export const MAJOR_OPTIONS = [
  "Computer Science",
  "Electrical and Computer Engineering",
  "Business Administration",
  "Biology",
  "Mathematics",
  "Psychology",
  "Economics",
  "Mechanical Engineering",
  "Civil Engineering",
  "Public Health",
] as const;

const DEMO_COURSE_SEEDS: Record<string, CompletedCourse[]> = {
  "Computer Science": [
    { courseId: "CS 312", grade: "A", semester: "Fall 2024", source: "demo_seed" },
    { courseId: "CS 314", grade: "A-", semester: "Spring 2025", source: "demo_seed" },
    { courseId: "CS 315", grade: "B+", semester: "Spring 2025", source: "demo_seed" },
    { courseId: "M 408C", grade: "A", semester: "Fall 2024", source: "demo_seed" },
  ],
  "Electrical and Computer Engineering": [
    { courseId: "ECE 302", grade: "A-", semester: "Fall 2024", source: "demo_seed" },
    { courseId: "ECE 306", grade: "B+", semester: "Spring 2025", source: "demo_seed" },
    { courseId: "M 408D", grade: "A", semester: "Spring 2025", source: "demo_seed" },
  ],
  "Business Administration": [
    { courseId: "ACC 311", grade: "A-", semester: "Fall 2024", source: "demo_seed" },
    { courseId: "MAN 101", grade: "A", semester: "Spring 2025", source: "demo_seed" },
    { courseId: "ECO 304K", grade: "B+", semester: "Spring 2025", source: "demo_seed" },
  ],
  Biology: [
    { courseId: "BIO 311C", grade: "A", semester: "Fall 2024", source: "demo_seed" },
    { courseId: "CH 301", grade: "B+", semester: "Fall 2024", source: "demo_seed" },
    { courseId: "BIO 311D", grade: "A-", semester: "Spring 2025", source: "demo_seed" },
  ],
};

export function deriveGpaRange(gpa: number | null | undefined): string {
  if (typeof gpa !== "number") {
    return "Not yet reviewed";
  }
  if (gpa >= 3.5) {
    return "3.5-4.0";
  }
  if (gpa >= 3) {
    return "3.0-3.5";
  }
  if (gpa >= 2.5) {
    return "2.5-3.0";
  }
  return "2.0-2.5";
}

export function getProfileGpaRange(profile: StudentProfile): string {
  return profile.gpaRange ?? deriveGpaRange(profile.gpa);
}

export function getProfileFirstName(profile: StudentProfile): string {
  const [firstName] = profile.name.trim().split(/\s+/);
  return firstName || profile.name;
}

export function getProfileResumeSummary(profile: StudentProfile): string {
  return profile.resumeSummary?.trim() ?? "";
}

export function getProfileCareerGoal(profile: StudentProfile): CareerGoal {
  return profile.careerGoal ?? "undecided";
}

export function getProfilePreferredLocations(profile: StudentProfile): string[] {
  return profile.preferredLocations ?? [];
}

export function getProfilePreferredTerms(profile: StudentProfile): string[] {
  return profile.preferredTerms ?? [];
}

export function buildSeedCourses(major: string): CompletedCourse[] {
  return DEMO_COURSE_SEEDS[major] ?? DEMO_COURSE_SEEDS["Computer Science"];
}

export function normalizeProfile(profile: StudentProfile): StudentProfile {
  return {
    ...profile,
    authUserId: profile.authUserId ?? null,
    gpa: typeof profile.gpa === "number" ? Number(profile.gpa.toFixed(2)) : null,
    gpaRange: getProfileGpaRange(profile),
    gpaPublic: profile.gpaPublic,
    resumeSummary: getProfileResumeSummary(profile),
    careerGoal: getProfileCareerGoal(profile),
    preferredLocations: getProfilePreferredLocations(profile),
    preferredTerms: getProfilePreferredTerms(profile),
    skills: profile.skills ?? [],
    interests: profile.interests ?? [],
    clubInterests: profile.clubInterests ?? [],
    completedCourses: profile.completedCourses ?? [],
    profilePhotoUrl: profile.profilePhotoUrl ?? null,
    transcriptFileName: profile.transcriptFileName ?? null,
    resumeFileName: profile.resumeFileName ?? null,
    transcriptUploadStatus: profile.transcriptUploadStatus ?? "missing",
    resumeUploadStatus: profile.resumeUploadStatus ?? "missing",
    accountMode: profile.accountMode ?? "fallback",
    authStatus: profile.authStatus ?? "signed_out",
  };
}
