import {
  AcademicAnalysis,
  CourseCatalog,
  DegreeRequirements,
  EligibleCourse,
  ImportedCourseScheduleCatalog,
  Recommendation,
  RecommendationUrgency,
  RequirementSection,
  StudentProfile,
} from "../types";
import { RankedEligibleCourse, rankEligibleCourses } from "./eligible-course-recommender";
import { getCourseAttemptStatus, normalizeCourseId } from "./completed-course-progress";
import { getNextRegularTerm } from "./course-schedule";
import { buildPrereqAlerts } from "./prereq-alerts";

function isElectiveGroup(groupId: string, title: string): boolean {
  const label = `${groupId} ${title}`.toLowerCase();
  return label.includes("elective");
}

function buildCourseMap(courses: EligibleCourse[]): Map<string, EligibleCourse> {
  return new Map(
    courses.map((course) => [normalizeCourseId(course.courseId), course]),
  );
}

function getSectionProgress(
  section: RequirementSection,
  completedCourseIds: Set<string>,
  courseMap: Map<string, EligibleCourse>,
  options?: { includeElectiveGroups?: boolean },
): number {
  let earnedCredits = 0;

  for (const group of section.groups) {
    if (!options?.includeElectiveGroups && isElectiveGroup(group.id, group.title)) {
      continue;
    }

    const completedGroupCredits = group.courses.reduce((total, courseId) => {
      if (!completedCourseIds.has(normalizeCourseId(courseId))) {
        return total;
      }

      return total + (courseMap.get(normalizeCourseId(courseId))?.credits ?? 0);
    }, 0);

    // We cap each group so partial progress never over-claims a requirement bucket.
    earnedCredits += Math.min(completedGroupCredits, group.credits);
  }

  return earnedCredits;
}

function getCompletedFlexibleElectiveCredits(
  degree: DegreeRequirements,
  completedCourseIds: Set<string>,
  courseMap: Map<string, EligibleCourse>,
): number {
  const electiveCredits = degree.totalCredits - degree.coreRequirements.creditsRequired - degree.majorRequirements.creditsRequired;

  if (electiveCredits <= 0) {
    return 0;
  }

  let earned = 0;

  for (const group of degree.majorRequirements.groups) {
    if (!isElectiveGroup(group.id, group.title)) {
      continue;
    }

    const completedGroupCredits = group.courses.reduce((total, courseId) => {
      if (!completedCourseIds.has(normalizeCourseId(courseId))) {
        return total;
      }

      return total + (courseMap.get(normalizeCourseId(courseId))?.credits ?? 0);
    }, 0);

    earned += completedGroupCredits;
  }

  return Math.min(earned, electiveCredits);
}

function getNextSemester(currentSemester: string, termsToAdvance: number): string {
  const match = currentSemester.match(/(spring|summer|fall)\s+(\d{4})/i);

  if (!match) {
    return `${termsToAdvance} term${termsToAdvance === 1 ? "" : "s"} remaining`;
  }

  let season = match[1].toLowerCase() === "fall" ? "Fall" : "Spring";
  let year = Number(match[2]);

  for (let index = 0; index < termsToAdvance; index += 1) {
    if (season === "Spring") {
      season = "Fall";
    } else {
      season = "Spring";
      year += 1;
    }
  }

  return `${season} ${year}`;
}

function getMissingRequiredCourses(
  section: RequirementSection,
  completedCourseIds: Set<string>,
  courseMap: Map<string, EligibleCourse>,
): EligibleCourse[] {
  const missingCourses: EligibleCourse[] = [];
  const seen = new Set<string>();

  for (const group of section.groups) {
    if (isElectiveGroup(group.id, group.title)) {
      continue;
    }

    for (const courseId of group.courses) {
      const normalizedId = normalizeCourseId(courseId);

      if (seen.has(normalizedId) || completedCourseIds.has(normalizedId)) {
        continue;
      }

      const course = courseMap.get(normalizedId);

      if (course) {
        missingCourses.push(course);
        seen.add(normalizedId);
      }
    }
  }

  return missingCourses;
}

function getMissingElectiveCourses(
  section: RequirementSection,
  completedCourseIds: Set<string>,
  courseMap: Map<string, EligibleCourse>,
): EligibleCourse[] {
  const missingCourses: EligibleCourse[] = [];
  const seen = new Set<string>();

  for (const group of section.groups) {
    if (!isElectiveGroup(group.id, group.title)) {
      continue;
    }

    for (const courseId of group.courses) {
      const normalizedId = normalizeCourseId(courseId);

      if (seen.has(normalizedId) || completedCourseIds.has(normalizedId)) {
        continue;
      }

      const course = courseMap.get(normalizedId);

      if (course) {
        missingCourses.push(course);
        seen.add(normalizedId);
      }
    }
  }

  return missingCourses;
}

function countDirectUnlocks(courseId: string, catalog: CourseCatalog, completedCourseIds: Set<string>): number {
  const normalizedId = normalizeCourseId(courseId);

  return catalog.courses.filter((course) => {
    if (completedCourseIds.has(normalizeCourseId(course.courseId))) {
      return false;
    }

    return course.prerequisites.some((prereq) => normalizeCourseId(prereq) === normalizedId);
  }).length;
}

function getUrgency(unlockCount: number, missingPrereqCount: number): RecommendationUrgency {
  if (missingPrereqCount === 0 && unlockCount >= 2) {
    return "critical";
  }

  if (missingPrereqCount <= 1) {
    return "recommended";
  }

  return "optional";
}

function buildRecommendation(
  course: EligibleCourse,
  rankedCourse: RankedEligibleCourse | undefined,
  completedCourseIds: Set<string>,
  catalog: CourseCatalog,
): Recommendation {
  const missingPrereqs = course.prerequisites.filter(
    (prereq) => !completedCourseIds.has(normalizeCourseId(prereq)),
  );
  const unlockCount = rankedCourse?.unlockCount ?? countDirectUnlocks(course.courseId, catalog, completedCourseIds);
  const urgency = getUrgency(unlockCount, missingPrereqs.length);

  let rationale = "This is still on your remaining degree path.";

  if (missingPrereqs.length === 0 && unlockCount > 0) {
    rationale = rankedCourse
      ? `You can take this in ${rankedCourse.scheduledTerm}, and it opens ${unlockCount} later course option${unlockCount === 1 ? "" : "s"}.`
      : `You already have the prerequisites, and this opens ${unlockCount} later course option${unlockCount === 1 ? "" : "s"} once it appears in a future term.`;
  } else if (missingPrereqs.length === 0) {
    rationale = rankedCourse
      ? `You are eligible for this in ${rankedCourse.scheduledTerm}, so it is a clean way to keep degree momentum.`
      : "You already have the prerequisites for this, so it becomes a clean way to keep degree momentum once it is scheduled.";
  } else {
    rationale = `You still need ${missingPrereqs.join(", ")} before this opens up.`;
  }

  return {
    courseId: course.courseId,
    courseName: course.courseName,
    requirementBucket: course.requirementBucket,
    urgency,
    rationale,
  };
}

function getAllDegreeCourseIds(degree: DegreeRequirements): Set<string> {
  const courseIds = new Set<string>();

  for (const section of [degree.coreRequirements, degree.majorRequirements]) {
    for (const group of section.groups) {
      for (const courseId of group.courses) {
        courseIds.add(normalizeCourseId(courseId));
      }
    }
  }

  return courseIds;
}

function compareCoursePriority(
  left: EligibleCourse,
  right: EligibleCourse,
  rankedById: Map<string, { entry: RankedEligibleCourse; index: number }>,
): number {
  const leftRank = rankedById.get(normalizeCourseId(left.courseId));
  const rightRank = rankedById.get(normalizeCourseId(right.courseId));

  if (leftRank && rightRank) {
    return leftRank.index - rightRank.index;
  }

  if (leftRank) {
    return -1;
  }

  if (rightRank) {
    return 1;
  }

  return left.courseId.localeCompare(right.courseId);
}

function buildRetakeRecommendations(
  degree: DegreeRequirements,
  catalog: CourseCatalog,
  scheduleCatalog: ImportedCourseScheduleCatalog,
  courseCatalogId: string,
  currentSemester: string,
  retakeCourseIds: Set<string>,
): Recommendation[] {
  if (retakeCourseIds.size === 0) {
    return [];
  }

  const courseMap = buildCourseMap(catalog.courses);
  const degreeCourseIds = getAllDegreeCourseIds(degree);
  const nextRegularTerm = getNextRegularTerm(currentSemester);

  const recommendations = Array.from(retakeCourseIds)
    .filter((courseId) => degreeCourseIds.has(courseId))
    .reduce<Recommendation[]>((accumulator, courseId) => {
      const course = courseMap.get(courseId);

      if (!course) {
        return accumulator;
      }

      const nextScheduledTerm =
        course.termsOffered.find((term) => term === nextRegularTerm) ??
        scheduleCatalog.termSnapshots
          .filter((snapshot) => snapshot.courseCatalogId === courseCatalogId)
          .find((snapshot) =>
            snapshot.offeredCourseIds.some(
              (offeredCourseId) => normalizeCourseId(offeredCourseId) === courseId,
            ),
          )?.term ??
        course.termsOffered[0] ??
        null;

      const termPhrase = nextScheduledTerm
        ? `Plan the retake for ${nextScheduledTerm}.`
        : "Plan the retake as soon as the course returns to the schedule.";

      accumulator.push({
        courseId: course.courseId,
        courseName: course.courseName,
        requirementBucket: course.requirementBucket,
        urgency: nextScheduledTerm === nextRegularTerm ? "critical" : "recommended",
        rationale: `A grade of D or lower does not count toward progress in Hook, so this stays incomplete until you retake it. ${termPhrase}`,
      } satisfies Recommendation);

      return accumulator;
    }, []);

  return recommendations.sort((left, right) => {
      if (left.urgency !== right.urgency) {
        return left.urgency === "critical" ? -1 : 1;
      }

      return left.courseId.localeCompare(right.courseId);
    });
}

function selectRecommendations(
  missingCourses: EligibleCourse[],
  rankedEligibleCourses: RankedEligibleCourse[],
  completedCourseIds: Set<string>,
  catalog: CourseCatalog,
  options?: {
    excludedCourseIds?: Set<string>;
    maxItems?: number;
  },
): Recommendation[] {
  const rankedById = new Map(
    rankedEligibleCourses.map((entry, index) => [normalizeCourseId(entry.course.courseId), { entry, index }]),
  );
  const excludedCourseIds = options?.excludedCourseIds ?? new Set<string>();
  const maxItems = options?.maxItems ?? 3;

  return [...missingCourses]
    .filter((course) => !excludedCourseIds.has(normalizeCourseId(course.courseId)))
    .sort((left, right) => compareCoursePriority(left, right, rankedById))
    .slice(0, maxItems)
    .map((course) =>
      buildRecommendation(
        course,
        rankedById.get(normalizeCourseId(course.courseId))?.entry,
        completedCourseIds,
        catalog,
      ),
    );
}

export function analyzeDegree(
  profile: StudentProfile,
  degree: DegreeRequirements,
  catalog: CourseCatalog,
  scheduleCatalog: ImportedCourseScheduleCatalog,
  courseCatalogId: string,
): AcademicAnalysis {
  const { completedCourseIds, retakeCourseIds } = getCourseAttemptStatus(profile);
  const courseMap = buildCourseMap(catalog.courses);
  const completedCoreCredits = getSectionProgress(
    degree.coreRequirements,
    completedCourseIds,
    courseMap,
  );
  const completedMajorCredits = getSectionProgress(
    degree.majorRequirements,
    completedCourseIds,
    courseMap,
  );
  const completedElectiveCredits = getCompletedFlexibleElectiveCredits(
    degree,
    completedCourseIds,
    courseMap,
  );
  const completedCredits = completedCoreCredits + completedMajorCredits + completedElectiveCredits;
  const remainingCredits = Math.max(degree.totalCredits - completedCredits, 0);
  const coreComplete = completedCoreCredits >= degree.coreRequirements.creditsRequired;
  const rankedEligibleCourses = rankEligibleCourses(
    catalog,
    degree,
    Array.from(completedCourseIds),
    profile.currentSemester,
    scheduleCatalog,
    courseCatalogId,
  );
  const missingCoreCourses = getMissingRequiredCourses(
    degree.coreRequirements,
    completedCourseIds,
    courseMap,
  );
  const missingMajorCourses = getMissingRequiredCourses(
    degree.majorRequirements,
    completedCourseIds,
    courseMap,
  );
  const missingElectiveCourses = getMissingElectiveCourses(
    degree.majorRequirements,
    completedCourseIds,
    courseMap,
  );
  const prereqAlerts = buildPrereqAlerts(
    degree,
    catalog,
    Array.from(completedCourseIds),
  );
  const percentComplete = Math.min(
    100,
    Math.round((completedCredits / degree.totalCredits) * 100),
  );
  const estimatedGraduationSemester =
    remainingCredits === 0
      ? profile.currentSemester
      : getNextSemester(profile.currentSemester, Math.ceil(remainingCredits / 15));
  const coreRecommendations = coreComplete
    ? []
    : selectRecommendations(
        missingCoreCourses,
        rankedEligibleCourses,
        completedCourseIds,
        catalog,
      );
  const retakeRecommendations = buildRetakeRecommendations(
    degree,
    catalog,
    scheduleCatalog,
    courseCatalogId,
    profile.currentSemester,
    retakeCourseIds,
  );
  const excludedRecommendationIds = new Set(
    retakeRecommendations.map((recommendation) => normalizeCourseId(recommendation.courseId)),
  );
  const requiredMajorRecommendations = selectRecommendations(
    missingMajorCourses,
    rankedEligibleCourses,
    completedCourseIds,
    catalog,
    {
      excludedCourseIds: excludedRecommendationIds,
      maxItems: Math.max(3 - retakeRecommendations.length, 0),
    },
  );

  for (const recommendation of requiredMajorRecommendations) {
    excludedRecommendationIds.add(normalizeCourseId(recommendation.courseId));
  }

  const electiveRecommendations = selectRecommendations(
    missingElectiveCourses,
    rankedEligibleCourses,
    completedCourseIds,
    catalog,
    {
      excludedCourseIds: excludedRecommendationIds,
      maxItems: Math.max(3 - retakeRecommendations.length - requiredMajorRecommendations.length, 0),
    },
  );

  const majorRecommendations = [
    ...retakeRecommendations,
    ...requiredMajorRecommendations,
    ...electiveRecommendations,
  ].slice(0, 3);
  const nextRegularTerm = getNextRegularTerm(profile.currentSemester);

  // The summary is short on purpose so a UI card can show it without extra trimming.
  const summary = prereqAlerts.length > 0
    ? `${profile.name} is ${percentComplete}% through the ${degree.degreeName}. The biggest watch-out is the prereq chain around ${(prereqAlerts[0].match(/[A-Z]+\s\d+/) ?? ["your next blocker"])[0]}.`
    : rankedEligibleCourses.length > 0
      ? `${profile.name} is ${percentComplete}% through the ${degree.degreeName} and should focus next on the highest-ranked eligible required courses in ${nextRegularTerm ?? "the next regular term"}.`
      : `${profile.name} is ${percentComplete}% through the ${degree.degreeName}, and Hook does not see any remaining courses that are both next-term scheduled and fully unlocked yet.`;

  return {
    courseCatalogId,
    nextRegularTerm,
    percentComplete,
    estimatedGraduationSemester,
    coreComplete,
    coreRecommendations,
    majorRecommendations,
    eligibleCourses: rankedEligibleCourses.slice(0, 8).map((entry) => entry.course),
    prereqAlerts,
    summary,
  };
}
