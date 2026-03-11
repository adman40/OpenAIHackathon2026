import type { CompletedCourse } from "../types";

const GRADE_POINTS: Record<string, number | null> = {
  A: 4.0,
  "A-": 3.67,
  "B+": 3.33,
  B: 3.0,
  "B-": 2.67,
  "C+": 2.33,
  C: 2.0,
  "C-": 1.67,
  "D+": 1.33,
  D: 1.0,
  "D-": 0.67,
  F: 0,
  CR: null,
  P: null,
  S: null,
  U: null,
  W: null,
  Q: null,
  I: null,
};

function roundToHundredths(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeLetterGrade(grade: string): string {
  return grade.trim().toUpperCase();
}

export function getGradePointsForLetterGrade(grade: string): number | null {
  const normalized = normalizeLetterGrade(grade);
  return normalized in GRADE_POINTS ? GRADE_POINTS[normalized] : null;
}

export function computeNumericGpa(courses: CompletedCourse[]): number | null {
  let weightedPoints = 0;
  let gradedCredits = 0;

  // Credits default to 3 so summaries without hours can still produce a reviewable GPA estimate.
  for (const course of courses) {
    const gradePoints = getGradePointsForLetterGrade(course.grade);

    if (gradePoints === null) {
      continue;
    }

    const credits = course.credits ?? 3;

    if (credits <= 0) {
      continue;
    }

    weightedPoints += gradePoints * credits;
    gradedCredits += credits;
  }

  if (gradedCredits === 0) {
    return null;
  }

  return roundToHundredths(weightedPoints / gradedCredits);
}

export function formatNumericGpa(gpa: number | null | undefined): string {
  if (gpa === null || gpa === undefined || Number.isNaN(gpa)) {
    return "Not available";
  }

  return gpa.toFixed(2);
}
