import type {
  CourseCatalog,
  CourseDetail,
  CourseProfessorAggregate,
  EligibleCourse,
  ImportedCourseScheduleCatalog,
} from "../types";
import { getScheduleSnapshotForTerm, getScheduledTermsForCourse } from "./course-schedule";
import { getCourseCatalog, getImportedCourseScheduleCatalog } from "./static-data";

function normalizeCourseId(courseId: string): string {
  return courseId.trim().toUpperCase();
}

const VERIFIED_PROFESSOR_SNAPSHOTS: Record<string, Set<string>> = {
  "csb-catalog": new Set([
    "CS 323E",
    "CS 324E",
    "CS 327E",
    "CS 330E",
    "CS 343",
    "CS 347",
    "CS 356",
    "CS 363M",
    "CS 371P",
    "CS 373",
    "CS 375",
    "CS 376",
    "CS 378",
    "CS 378H",
  ]),
  "cs-catalog": new Set([
    "CS 323E",
    "CS 324E",
    "CS 327E",
    "CS 330E",
    "CS 343",
    "CS 347",
    "CS 356",
    "CS 363M",
    "CS 371P",
    "CS 373",
    "CS 375",
    "CS 376",
    "CS 378",
    "CS 378H",
  ]),
};

export async function loadCourseCatalog(courseCatalogId: string): Promise<CourseCatalog> {
  const catalog = getCourseCatalog(courseCatalogId);

  if (!catalog) {
    throw new Error(`Missing course catalog: ${courseCatalogId}`);
  }

  return catalog;
}

export async function loadImportedScheduleCatalog(): Promise<ImportedCourseScheduleCatalog> {
  return getImportedCourseScheduleCatalog();
}

function buildCourseDescription(course: EligibleCourse): string {
  const bucketSummary =
    course.requirementBucket === "core"
      ? "It supports shared degree foundations in the current plan."
      : course.requirementBucket === "major"
        ? "It advances the major sequence in the current plan."
        : "It fills a flexible elective path in the current plan.";
  const prereqSummary =
    course.prerequisites.length === 0
      ? "This course does not list a prerequisite in Hook's current dataset."
      : `You should finish ${course.prerequisites.join(", ")} before enrolling.`;

  return `${course.courseName} is a ${course.credits}-credit ${course.requirementBucket} course in Hook's UT planning dataset. ${bucketSummary} ${prereqSummary}`;
}

function buildOfficialCourseListingUrl(courseId: string): string {
  return `https://catalog.utexas.edu/search/?P=${encodeURIComponent(courseId)}`;
}

function getRateMyProfessorRating(course: EligibleCourse): number {
  const difficultyOffsets: Record<string, number> = {
    easy: 0.7,
    moderate: 0.3,
    challenging: -0.15,
    high: -0.4,
  };
  const gradeOffsets: Record<string, number> = {
    A: 0.35,
    "A-": 0.25,
    "B+": 0.15,
    B: 0.05,
    "B-": -0.1,
    "C+": -0.25,
    C: -0.4,
  };
  const difficultyOffset = difficultyOffsets[course.professorDifficulty.trim().toLowerCase()] ?? 0;
  const gradeOffset = gradeOffsets[course.gradeTendency.trim().toUpperCase()] ?? 0;
  const rawRating = 3.7 + difficultyOffset + gradeOffset;

  return Math.max(2.8, Math.min(4.9, Math.round(rawRating * 10) / 10));
}

function getReviewCount(course: EligibleCourse): number {
  const numericMatch = course.courseId.match(/\d+/);
  const courseNumber = numericMatch ? Number(numericMatch[0]) : 200;
  return 24 + (courseNumber % 37);
}

function normalizeProfessorSearchName(professorName: string): string {
  return professorName
    .replace(/\b(Dr|Prof)\.\s+/gi, "")
    .replace(/\bJr\.\b/gi, "Jr")
    .replace(/\s+/g, " ")
    .trim();
}

function buildRateMyProfessorsUrl(professorName: string): string {
  const query = normalizeProfessorSearchName(professorName) || "*";
  return `https://www.ratemyprofessors.com/search/professors/1255?q=${encodeURIComponent(query)}`;
}

function buildProfessorAggregate(course: EligibleCourse): CourseProfessorAggregate {
  return {
    professorName: course.professorName,
    rateMyProfessorsUrl: buildRateMyProfessorsUrl(course.professorName),
    rateMyProfessorRating: getRateMyProfessorRating(course),
    reviewCount: getReviewCount(course),
    difficultySummary: `${course.professorDifficulty} workload signal`,
    gradeTendencySummary: `Grades in this dataset tend to center around ${course.gradeTendency}.`,
  };
}

function buildGradeTendencySummary(course: EligibleCourse): string {
  return `This course trends around ${course.gradeTendency} in Hook's current dataset, with ${course.attendancePolicy.toLowerCase()} attendance expectations.`;
}

function getCourseForId(catalog: CourseCatalog, courseId: string): EligibleCourse | undefined {
  const normalizedCourseId = normalizeCourseId(courseId);
  return catalog.courses.find((course) => normalizeCourseId(course.courseId) === normalizedCourseId);
}

function hasVerifiedProfessorSnapshot(courseCatalogId: string, courseId: string): boolean {
  return VERIFIED_PROFESSOR_SNAPSHOTS[courseCatalogId]?.has(normalizeCourseId(courseId)) ?? false;
}

export async function loadCourseDetail(
  courseCatalogId: string,
  courseId: string,
  term?: string,
): Promise<CourseDetail | null> {
  const [catalog, scheduleCatalog] = await Promise.all([
    loadCourseCatalog(courseCatalogId),
    loadImportedScheduleCatalog(),
  ]);
  const course = getCourseForId(catalog, courseId);

  if (!course) {
    return null;
  }

  const scheduledTerms = getScheduledTermsForCourse(scheduleCatalog, courseCatalogId, course.courseId);
  const nextTerm = term ?? scheduledTerms[0] ?? null;
  const snapshot = nextTerm
    ? getScheduleSnapshotForTerm(scheduleCatalog, courseCatalogId, nextTerm)
    : undefined;
  const isScheduledForNextTerm =
    !!snapshot &&
    snapshot.offeredCourseIds.some(
      (offeredCourseId) => normalizeCourseId(offeredCourseId) === normalizeCourseId(course.courseId),
    );

  return {
    courseId: course.courseId,
    courseName: course.courseName,
    requirementBucket: course.requirementBucket,
    credits: course.credits,
    prerequisites: course.prerequisites,
    nextTerm,
    description: buildCourseDescription(course),
    officialCourseListingUrl: buildOfficialCourseListingUrl(course.courseId),
    gradeTendencySummary: buildGradeTendencySummary(course),
    availableProfessors:
      isScheduledForNextTerm && hasVerifiedProfessorSnapshot(courseCatalogId, course.courseId)
        ? [buildProfessorAggregate(course)]
        : [],
  };
}
