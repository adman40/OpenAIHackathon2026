import { buildSeedCourses } from "./profile-utils";
import type { CompletedCourse } from "./types";

const GRADE_POINTS: Record<string, number> = {
  A: 4,
  "A-": 3.67,
  "B+": 3.33,
  B: 3,
  "B-": 2.67,
  "C+": 2.33,
  C: 2,
  "C-": 1.67,
  D: 1,
  F: 0,
};

const SKILL_KEYWORDS = [
  "python",
  "typescript",
  "javascript",
  "react",
  "sql",
  "java",
  "c++",
  "machine learning",
  "data analysis",
  "figma",
  "product design",
  "leadership",
  "public speaking",
  "research",
] as const;

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function computeGpa(courses: CompletedCourse[]): number | null {
  const graded = courses
    .map((course) => GRADE_POINTS[course.grade])
    .filter((value): value is number => typeof value === "number");

  if (graded.length === 0) {
    return null;
  }

  const total = graded.reduce((sum, value) => sum + value, 0);
  return Number((total / graded.length).toFixed(2));
}

export async function parseTranscriptFile(file: File, major: string) {
  const isTextReadable = file.type.startsWith("text/") || /\.(txt|md|csv|json)$/i.test(file.name);
  const rawText = isTextReadable ? await file.text() : "";
  const text = normalizeWhitespace(rawText);
  const matches = Array.from(
    text.matchAll(/([A-Z]{2,4}\s?\d{3}[A-Z]?)\s+(A-|A|B\+|B-|B|C\+|C-|C|D|F)/g),
  );

  const parsedCourses =
    matches.length > 0
      ? matches.slice(0, 12).map((match, index) => ({
          courseId: match[1].replace(/\s+/, " ").toUpperCase(),
          grade: match[2].toUpperCase(),
          semester: `Imported ${index + 1}`,
          source: "transcript_upload" as const,
        }))
      : buildSeedCourses(major).map((course) => ({
          ...course,
          source: "transcript_upload" as const,
        }));

  return {
    courses: parsedCourses,
    gpa: computeGpa(parsedCourses),
    usedFallback: matches.length === 0,
  };
}

export async function parseResumeFile(file: File, major: string) {
  const isTextReadable = file.type.startsWith("text/") || /\.(txt|md|json)$/i.test(file.name);
  const rawText = isTextReadable ? await file.text() : "";
  const text = normalizeWhitespace(rawText);
  const lower = text.toLowerCase();
  const skills = SKILL_KEYWORDS.filter((skill) => lower.includes(skill)).slice(0, 8);

  const seededSkills =
    skills.length > 0
      ? skills
      : major === "Business Administration"
        ? ["leadership", "data analysis", "public speaking"]
        : major === "Biology"
          ? ["research", "data analysis", "public speaking"]
          : ["python", "typescript", "sql"];

  return {
    skills: seededSkills,
    summary:
      text.slice(0, 220) ||
      `${major} student with a browser-safe resume fallback. Skills were seeded so the demo stays coherent when the uploaded file is not text-readable yet.`,
    usedFallback: text.length === 0,
  };
}

export async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to preview the selected image."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });
}
