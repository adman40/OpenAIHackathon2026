import { CompletedCourse, StudentProfile } from "../types";

export function normalizeCourseId(courseId: string): string {
  return courseId.trim().toUpperCase();
}

function normalizeGrade(grade: string | null | undefined): string {
  return (grade ?? "").trim().toUpperCase();
}

export function isPassingGrade(grade: string | null | undefined): boolean {
  const normalized = normalizeGrade(grade);

  if (!normalized) {
    return false;
  }

  if (["CR", "P", "S", "IP"].includes(normalized)) {
    return true;
  }

  if (["F", "D+", "D", "D-", "Q", "W", "WF", "I", "U", "NC", "NCR"].includes(normalized)) {
    return false;
  }

  return /^A[+-]?$|^B[+-]?$|^C[+-]?$/.test(normalized);
}

export function requiresRetake(grade: string | null | undefined): boolean {
  return ["F", "D+", "D", "D-"].includes(normalizeGrade(grade));
}

interface CourseAttemptStatus {
  completedCourseIds: Set<string>;
  retakeCourseIds: Set<string>;
  latestAttemptByCourseId: Map<string, CompletedCourse>;
}

export function getCourseAttemptStatus(profile: StudentProfile): CourseAttemptStatus {
  const attemptsByCourseId = new Map<string, CompletedCourse[]>();

  for (const course of profile.completedCourses) {
    const normalizedCourseId = normalizeCourseId(course.courseId);
    const current = attemptsByCourseId.get(normalizedCourseId) ?? [];
    current.push(course);
    attemptsByCourseId.set(normalizedCourseId, current);
  }

  const completedCourseIds = new Set<string>();
  const retakeCourseIds = new Set<string>();
  const latestAttemptByCourseId = new Map<string, CompletedCourse>();

  for (const [courseId, attempts] of attemptsByCourseId.entries()) {
    const latestAttempt = attempts[attempts.length - 1];

    if (latestAttempt) {
      latestAttemptByCourseId.set(courseId, latestAttempt);
    }

    if (attempts.some((attempt) => isPassingGrade(attempt.grade))) {
      completedCourseIds.add(courseId);
      continue;
    }

    if (attempts.some((attempt) => requiresRetake(attempt.grade))) {
      retakeCourseIds.add(courseId);
    }
  }

  return {
    completedCourseIds,
    retakeCourseIds,
    latestAttemptByCourseId,
  };
}
