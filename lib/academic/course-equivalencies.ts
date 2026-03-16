import type { CompletedCourse, StudentProfile } from "../types";

function normalizeCourseId(courseId: string): string {
  return courseId.trim().toUpperCase().replace(/\s+/g, " ");
}

const COURSE_EQUIVALENCIES: Record<string, Record<string, string[]>> = {
  "cs-catalog": {
    "M 408C": ["MATH 221"],
    "M 408D": ["MATH 231"],
    "CS 312": ["CS 101"],
    "CS 311": ["CS 111"],
    "CS 311H": ["CS 111"],
    "CS 314": ["CS 210"],
    "CS 314H": ["CS 210"],
    "PHY 303K": ["PHYS 201"],
    "PHY 303L": ["PHYS 202"],
  },
  "ece-catalog": {
    "M 408C": ["MATH 221"],
    "M 408D": ["MATH 232"],
    "PHY 303K": ["PHYS 201"],
    "PHY 303L": ["PHYS 202"],
  },
  "biology-catalog": {
    "M 408C": ["MATH 121"],
    "CH 301": ["CHEM 101"],
    "CH 302": ["CHEM 102"],
    "BIO 311C": ["BIOL 110"],
    "BIO 311D": ["BIOL 120"],
    "PHY 303K": ["CHEM 201"],
  },
  "business-catalog": {
    "M 408C": ["MATH 120"],
    "ECO 304K": ["ECON 101"],
    "ECO 304L": ["ECON 102"],
  },
};

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
): StudentProfile {
  const catalogEquivalencies = COURSE_EQUIVALENCIES[courseCatalogId] ?? {};
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
