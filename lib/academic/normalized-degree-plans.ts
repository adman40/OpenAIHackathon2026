import {
  DegreeRequirements,
  NormalizedDegreePlan,
  NormalizedDegreePlanCatalog,
  RequirementBucket,
} from "../types";

export interface RemainingRequirementBucket {
  bucketId: string;
  title: string;
  bucketType: RequirementBucket;
  creditsRequired: number;
  completedCourses: string[];
  remainingCourses: string[];
  notes: string;
}

function normalizeMajorName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findNormalizedDegreePlanForMajor(
  majorName: string,
  catalog: NormalizedDegreePlanCatalog,
): NormalizedDegreePlan | undefined {
  const lookup = normalizeMajorName(majorName);

  return catalog.plans.find((plan) =>
    [plan.majorName, ...plan.aliases].some((candidate) => normalizeMajorName(candidate) === lookup),
  );
}

export function toDegreeRequirements(plan: NormalizedDegreePlan): DegreeRequirements {
  const coreGroups = plan.requirementBuckets
    .filter((bucket) => bucket.bucketType === "core")
    .map((bucket) => ({
      id: bucket.id,
      title: bucket.title,
      credits: bucket.creditsRequired,
      courses: bucket.courses,
      notes: bucket.notes,
    }));
  const majorGroups = plan.requirementBuckets
    .filter((bucket) => bucket.bucketType !== "core")
    .map((bucket) => ({
      id: bucket.id,
      title: bucket.title,
      credits: bucket.creditsRequired,
      courses: bucket.courses,
      notes: bucket.notes,
    }));
  const nonElectiveMajorCredits = majorGroups
    .filter((group) => group.id && !group.id.toLowerCase().includes("elective"))
    .reduce((total, group) => total + group.credits, 0);

  return {
    degreeId: plan.degreeId,
    degreeName: plan.degreeName,
    college: plan.college,
    totalCredits: plan.totalCredits,
    coreRequirements: {
      creditsRequired: coreGroups.reduce((total, group) => total + group.credits, 0),
      groups: coreGroups,
    },
    majorRequirements: {
      creditsRequired: nonElectiveMajorCredits,
      groups: majorGroups,
    },
  };
}

export function getRemainingRequirementBuckets(
  plan: NormalizedDegreePlan,
  completedCourseIds: string[],
): RemainingRequirementBucket[] {
  const completed = new Set(completedCourseIds.map((courseId) => courseId.trim().toUpperCase()));

  // This keeps the normalized plan directly useful for grouped "what is left?" UI work later on.
  return plan.requirementBuckets
    .map((bucket) => {
      const completedCourses = bucket.courses.filter((courseId) =>
        completed.has(courseId.trim().toUpperCase()),
      );
      const remainingCourses = bucket.courses.filter(
        (courseId) => !completed.has(courseId.trim().toUpperCase()),
      );

      return {
        bucketId: bucket.id,
        title: bucket.title,
        bucketType: bucket.bucketType,
        creditsRequired: bucket.creditsRequired,
        completedCourses,
        remainingCourses,
        notes: bucket.notes,
      };
    })
    .filter((bucket) => bucket.remainingCourses.length > 0);
}
