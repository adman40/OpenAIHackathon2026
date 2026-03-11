import { CourseCatalog, DegreeRequirements, EligibleCourse } from "../types";

export interface RankedEligibleCourse {
  course: EligibleCourse;
  score: number;
  unlockCount: number;
  professorSignal: number;
  isRequired: boolean;
}

function normalizeCourseId(courseId: string): string {
  return courseId.trim().toUpperCase();
}

function isElectiveGroup(groupId: string, title: string): boolean {
  const label = `${groupId} ${title}`.toLowerCase();
  return label.includes("elective");
}

function getRequiredCourseIds(degree: DegreeRequirements): Set<string> {
  const required = new Set<string>();

  for (const section of [degree.coreRequirements, degree.majorRequirements]) {
    for (const group of section.groups) {
      if (isElectiveGroup(group.id, group.title)) {
        continue;
      }

      for (const courseId of group.courses) {
        required.add(normalizeCourseId(courseId));
      }
    }
  }

  return required;
}

function getNextRegularTerm(currentSemester: string): string | null {
  const match = currentSemester.match(/(spring|summer|fall)\s+(\d{4})/i);

  if (!match) {
    return null;
  }

  const season = match[1].toLowerCase();

  if (season === "spring" || season === "summer") {
    return "Fall";
  }

  return "Spring";
}

function getGradeScore(gradeTendency: string): number {
  const normalized = gradeTendency.trim().toUpperCase();
  const scores: Record<string, number> = {
    A: 12,
    "A-": 11,
    "B+": 10,
    B: 8,
    "B-": 6,
    "C+": 4,
    C: 2,
  };

  return scores[normalized] ?? 5;
}

function getDifficultyScore(professorDifficulty: string): number {
  const normalized = professorDifficulty.trim().toLowerCase();
  const scores: Record<string, number> = {
    easy: 6,
    moderate: 4,
    challenging: 2,
    high: 1,
  };

  return scores[normalized] ?? 3;
}

function getAttendanceScore(attendancePolicy: string): number {
  const normalized = attendancePolicy.trim().toLowerCase();
  const scores: Record<string, number> = {
    optional: 2,
    recommended: 1,
    required: 0,
  };

  return scores[normalized] ?? 0;
}

function getProfessorSignalScore(course: EligibleCourse): number {
  return (
    getGradeScore(course.gradeTendency) +
    getDifficultyScore(course.professorDifficulty) +
    getAttendanceScore(course.attendancePolicy)
  );
}

function buildDependentsMap(courses: EligibleCourse[]): Map<string, string[]> {
  const dependents = new Map<string, string[]>();

  for (const course of courses) {
    for (const prereq of course.prerequisites) {
      const key = normalizeCourseId(prereq);
      const current = dependents.get(key) ?? [];
      current.push(normalizeCourseId(course.courseId));
      dependents.set(key, current);
    }
  }

  return dependents;
}

function countFutureUnlocks(
  courseId: string,
  dependentsMap: Map<string, string[]>,
  completedCourseIds: Set<string>,
): number {
  const visited = new Set<string>();
  const stack = [...(dependentsMap.get(normalizeCourseId(courseId)) ?? [])];
  let count = 0;

  // We count the downstream chain so the ranking rewards courses that open more paths.
  while (stack.length > 0) {
    const nextId = stack.pop();

    if (!nextId || visited.has(nextId)) {
      continue;
    }

    visited.add(nextId);

    if (!completedCourseIds.has(nextId)) {
      count += 1;
    }

    for (const dependent of dependentsMap.get(nextId) ?? []) {
      stack.push(dependent);
    }
  }

  return count;
}

function isEligibleNow(course: EligibleCourse, completedCourseIds: Set<string>): boolean {
  return course.prerequisites.every((prereq) =>
    completedCourseIds.has(normalizeCourseId(prereq)),
  );
}

export function rankEligibleCourses(
  catalog: CourseCatalog,
  degree: DegreeRequirements,
  completedCourseIds: string[],
  currentSemester: string,
): RankedEligibleCourse[] {
  const completed = new Set(completedCourseIds.map(normalizeCourseId));
  const requiredCourseIds = getRequiredCourseIds(degree);
  const dependentsMap = buildDependentsMap(catalog.courses);
  const nextTerm = getNextRegularTerm(currentSemester);

  // The score is intentionally simple so the API can explain why a course bubbled up.
  return catalog.courses
    .filter((course) => !completed.has(normalizeCourseId(course.courseId)))
    .filter((course) => isEligibleNow(course, completed))
    .map((course) => {
      const normalizedId = normalizeCourseId(course.courseId);
      const unlockCount = countFutureUnlocks(course.courseId, dependentsMap, completed);
      const professorSignal = getProfessorSignalScore(course);
      const isRequired = requiredCourseIds.has(normalizedId);
      const requiredBonus = isRequired ? 80 : course.requirementBucket === "elective" ? 20 : 45;
      const termBonus = nextTerm && course.termsOffered.includes(nextTerm) ? 8 : 0;
      const score = requiredBonus + unlockCount * 10 + professorSignal + termBonus;

      return {
        course,
        score,
        unlockCount,
        professorSignal,
        isRequired,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.unlockCount !== left.unlockCount) {
        return right.unlockCount - left.unlockCount;
      }

      return left.course.courseId.localeCompare(right.course.courseId);
    });
}
