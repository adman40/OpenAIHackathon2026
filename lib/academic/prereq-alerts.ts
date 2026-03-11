import { CourseCatalog, DegreeRequirements, EligibleCourse } from "../types";

function normalizeCourseId(courseId: string): string {
  return courseId.trim().toUpperCase();
}

function isElectiveGroup(groupId: string, title: string): boolean {
  const label = `${groupId} ${title}`.toLowerCase();
  return label.includes("elective");
}

function getRequiredMajorCourseIds(degree: DegreeRequirements): Set<string> {
  const required = new Set<string>();

  for (const group of degree.majorRequirements.groups) {
    if (isElectiveGroup(group.id, group.title)) {
      continue;
    }

    for (const courseId of group.courses) {
      required.add(normalizeCourseId(courseId));
    }
  }

  return required;
}

function buildCourseMap(courses: EligibleCourse[]): Map<string, EligibleCourse> {
  return new Map(
    courses.map((course) => [normalizeCourseId(course.courseId), course]),
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

function countRequiredDescendants(
  courseId: string,
  dependentsMap: Map<string, string[]>,
  requiredMajorCourseIds: Set<string>,
  completedCourseIds: Set<string>,
): number {
  const visited = new Set<string>();
  const stack = [...(dependentsMap.get(normalizeCourseId(courseId)) ?? [])];
  let count = 0;

  while (stack.length > 0) {
    const nextId = stack.pop();

    if (!nextId || visited.has(nextId)) {
      continue;
    }

    visited.add(nextId);

    if (requiredMajorCourseIds.has(nextId) && !completedCourseIds.has(nextId)) {
      count += 1;
    }

    for (const dependent of dependentsMap.get(nextId) ?? []) {
      stack.push(dependent);
    }
  }

  return count;
}

function formatCourseList(courseIds: string[]): string {
  if (courseIds.length === 0) {
    return "";
  }

  if (courseIds.length === 1) {
    return courseIds[0];
  }

  if (courseIds.length === 2) {
    return `${courseIds[0]} and ${courseIds[1]}`;
  }

  return `${courseIds.slice(0, -1).join(", ")}, and ${courseIds[courseIds.length - 1]}`;
}

export function buildPrereqAlerts(
  degree: DegreeRequirements,
  catalog: CourseCatalog,
  completedCourseIds: string[],
): string[] {
  const completed = new Set(completedCourseIds.map(normalizeCourseId));
  const requiredMajorCourseIds = getRequiredMajorCourseIds(degree);
  const courseMap = buildCourseMap(catalog.courses);
  const dependentsMap = buildDependentsMap(catalog.courses);

  const blockerAlerts = Array.from(requiredMajorCourseIds)
    .filter((courseId) => !completed.has(courseId))
    .map((courseId) => {
      const course = courseMap.get(courseId);

      if (!course) {
        return null;
      }

      const missingPrereqs = course.prerequisites.filter(
        (prereq) => !completed.has(normalizeCourseId(prereq)),
      );

      if (missingPrereqs.length === 0) {
        return null;
      }

      const blockerScores = missingPrereqs.map((prereq) => {
        const normalizedPrereq = normalizeCourseId(prereq);

        return {
          prereq,
          downstreamCount: countRequiredDescendants(
            normalizedPrereq,
            dependentsMap,
            requiredMajorCourseIds,
            completed,
          ),
        };
      });

      blockerScores.sort((left, right) => right.downstreamCount - left.downstreamCount);

      const primaryBlocker = blockerScores[0];

      if (!primaryBlocker) {
        return null;
      }

      const directDependents = (dependentsMap.get(normalizeCourseId(primaryBlocker.prereq)) ?? [])
        .filter((dependentId) => requiredMajorCourseIds.has(dependentId))
        .filter((dependentId) => !completed.has(dependentId))
        .slice(0, 4);

      return {
        message:
          primaryBlocker.downstreamCount >= 2
            ? `${primaryBlocker.prereq} is a key blocker right now. Until you finish it, ${course.courseId} stays blocked and the later ${formatCourseList(directDependents)} path can keep slipping.`
            : `${course.courseId} is still blocked because you need ${formatCourseList(missingPrereqs)} first.`,
        impactScore: primaryBlocker.downstreamCount,
      };
    })
    .filter((alert): alert is { message: string; impactScore: number } => alert !== null)
    .sort((left, right) => right.impactScore - left.impactScore);

  // We cap the list so the warnings stay scannable in the demo UI.
  return blockerAlerts.slice(0, 3).map((alert) => alert.message);
}
