import { ImportedCourseScheduleCatalog, ImportedCourseScheduleTermSnapshot } from "../types";

function normalizeCourseId(courseId: string): string {
  return courseId.trim().toUpperCase();
}

function normalizeTermLabel(term: string): string {
  const match = term.match(/(spring|summer|fall|winter)\s+(\d{4})/i);

  if (!match) {
    return term.trim();
  }

  const season = match[1].toLowerCase();
  const normalizedSeason =
    season === "spring"
      ? "Spring"
      : season === "summer"
        ? "Summer"
        : season === "fall"
          ? "Fall"
          : "Winter";

  return `${normalizedSeason} ${match[2]}`;
}

function getTermSortValue(term: string): number {
  const match = normalizeTermLabel(term).match(/(Spring|Summer|Fall|Winter)\s+(\d{4})/);

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const seasonOrder: Record<string, number> = {
    Spring: 1,
    Summer: 2,
    Fall: 3,
    Winter: 4,
  };

  return Number(match[2]) * 10 + (seasonOrder[match[1]] ?? 9);
}

export function getNextRegularTerm(currentSemester: string): string | null {
  const match = currentSemester.match(/(spring|summer|fall|winter)\s+(\d{4})/i);

  if (!match) {
    return null;
  }

  const season = match[1].toLowerCase();
  const year = Number(match[2]);

  if (season === "fall") {
    return `Spring ${year + 1}`;
  }

  return `Fall ${year}`;
}

export function getScheduleSnapshotForTerm(
  scheduleCatalog: ImportedCourseScheduleCatalog,
  courseCatalogId: string,
  term: string,
): ImportedCourseScheduleTermSnapshot | undefined {
  const normalizedTerm = normalizeTermLabel(term);

  return scheduleCatalog.termSnapshots.find(
    (snapshot) =>
      snapshot.courseCatalogId === courseCatalogId &&
      snapshot.isRegularTerm &&
      normalizeTermLabel(snapshot.term) === normalizedTerm,
  );
}

export function getScheduledCourseIds(snapshot: ImportedCourseScheduleTermSnapshot): Set<string> {
  return new Set(snapshot.offeredCourseIds.map(normalizeCourseId));
}

export function getScheduledTermsForCourse(
  scheduleCatalog: ImportedCourseScheduleCatalog,
  courseCatalogId: string,
  courseId: string,
): string[] {
  const normalizedCourseId = normalizeCourseId(courseId);

  return scheduleCatalog.termSnapshots
    .filter((snapshot) => snapshot.courseCatalogId === courseCatalogId)
    .filter((snapshot) =>
      snapshot.offeredCourseIds.some(
        (offeredCourseId) => normalizeCourseId(offeredCourseId) === normalizedCourseId,
      ),
    )
    .map((snapshot) => normalizeTermLabel(snapshot.term))
    .sort((left, right) => getTermSortValue(left) - getTermSortValue(right));
}
