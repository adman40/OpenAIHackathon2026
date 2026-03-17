import type { CompletedCourse, CourseEquivalencyCatalog, StudentProfile } from "../types";

function normalizeCourseId(courseId: string): string {
  return courseId.trim().toUpperCase().replace(/\s+/g, " ");
}

function dedupeCompletedCourses(courses: CompletedCourse[]): CompletedCourse[] {
  const deduped = new Map<string, CompletedCourse>();

  for (const course of courses) {
    const normalizedCourseId = normalizeCourseId(course.courseId);

    if (!deduped.has(normalizedCourseId)) {
      deduped.set(normalizedCourseId, {
        ...course,
        courseId: normalizedCourseId,
      });
    }
  }

  return Array.from(deduped.values());
}

export function expandCompletedCoursesForAcademicAnalysis(
  profile: StudentProfile,
  courseCatalogId: string,
  courseEquivalencies: CourseEquivalencyCatalog,
): StudentProfile {
  const catalogEquivalencies = courseEquivalencies[courseCatalogId] ?? {};
  const expandedCourses: CompletedCourse[] = [];

  for (const course of profile.completedCourses) {
    const normalizedCourseId = normalizeCourseId(course.courseId);

    expandedCourses.push({
      ...course,
      courseId: normalizedCourseId,
    });

    for (const equivalentCourseId of catalogEquivalencies[normalizedCourseId] ?? []) {
      expandedCourses.push({
        ...course,
        courseId: equivalentCourseId,
      });
    }
  }

  return {
    ...profile,
    completedCourses: dedupeCompletedCourses(expandedCourses),
  };
}
