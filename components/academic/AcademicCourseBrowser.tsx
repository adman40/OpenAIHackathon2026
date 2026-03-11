"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { AcademicAnalysis, CourseDetail, EligibleCourse, Recommendation } from "../../lib/types";

type CourseBrowserItem = {
  courseId: string;
  courseName: string;
  requirementBucket: "core" | "major" | "elective";
  badge: string;
  description: string;
  section: string;
  term: string | null;
};

interface AcademicCourseBrowserProps {
  analysis: AcademicAnalysis;
}

function buildBrowserItems(analysis: AcademicAnalysis): CourseBrowserItem[] {
  const itemMap = new Map<string, CourseBrowserItem>();

  const upsertRecommendation = (section: string, badge: string, recommendation: Recommendation) => {
    const key = recommendation.courseId.trim().toUpperCase();

    if (itemMap.has(key)) {
      return;
    }

    itemMap.set(key, {
      courseId: recommendation.courseId,
      courseName: recommendation.courseName,
      requirementBucket: recommendation.requirementBucket,
      badge,
      description: recommendation.rationale,
      section,
      term: analysis.nextRegularTerm,
    });
  };

  const upsertEligibleCourse = (section: string, course: EligibleCourse) => {
    const key = course.courseId.trim().toUpperCase();

    if (itemMap.has(key)) {
      return;
    }

    itemMap.set(key, {
      courseId: course.courseId,
      courseName: course.courseName,
      requirementBucket: course.requirementBucket,
      badge: course.requirementBucket === "elective" ? "Eligible elective" : "Eligible now",
      description:
        course.eligibilityReason ??
        "Eligible in the next regular term based on the current transcript snapshot.",
      section,
      term: analysis.nextRegularTerm,
    });
  };

  analysis.majorRecommendations.forEach((recommendation) =>
    upsertRecommendation("Recommended next courses", recommendation.urgency, recommendation),
  );
  analysis.coreRecommendations.forEach((recommendation) =>
    upsertRecommendation("Core cleanup", recommendation.urgency, recommendation),
  );
  analysis.eligibleCourses.forEach((course) =>
    upsertEligibleCourse("Other eligible options", course),
  );

  return Array.from(itemMap.values());
}

function formatBucket(bucket: CourseBrowserItem["requirementBucket"]): string {
  return bucket === "core" ? "Core" : bucket === "major" ? "Major" : "Elective";
}

function bucketBadgeClass(bucket: CourseBrowserItem["requirementBucket"]): string {
  if (bucket === "major") {
    return "bg-orange-100 text-orange-800 border-orange-200";
  }

  if (bucket === "core") {
    return "bg-sky-100 text-sky-800 border-sky-200";
  }

  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

function recommendationBadgeClass(badge: string): string {
  const normalized = badge.toLowerCase();

  if (normalized === "critical") {
    return "bg-red-100 text-red-800 border-red-200";
  }

  if (normalized === "recommended") {
    return "bg-orange-100 text-orange-800 border-orange-200";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
}

function formatNextTerm(term: string | null): string {
  return term ? `Best fit for ${term}` : "Schedule timing varies";
}

export function AcademicCourseBrowser({ analysis }: AcademicCourseBrowserProps) {
  const items = useMemo(() => buildBrowserItems(analysis), [analysis]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(items[0]?.courseId ?? null);
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const detailCacheRef = useRef<Map<string, CourseDetail>>(new Map());

  useEffect(() => {
    setSelectedCourseId(items[0]?.courseId ?? null);
  }, [items]);

  useEffect(() => {
    if (!selectedCourseId) {
      setDetail(null);
      setDetailError(null);
      return;
    }

    const selectedItem = items.find((item) => item.courseId === selectedCourseId);

    if (!selectedItem) {
      setDetail(null);
      setDetailError("Selected course could not be found.");
      return;
    }

    const courseToLoad = selectedItem;

    const controller = new AbortController();

    async function loadDetail() {
      try {
        const params = new URLSearchParams({
          catalogId: analysis.courseCatalogId,
          courseId: courseToLoad.courseId,
        });

        if (courseToLoad.term) {
          params.set("term", courseToLoad.term);
        }

        const cacheKey = params.toString();
        const cachedDetail = detailCacheRef.current.get(cacheKey);

        if (cachedDetail) {
          setDetail(cachedDetail);
          setDetailError(null);
          setIsLoadingDetail(false);
          return;
        }

        setIsLoadingDetail(true);
        setDetailError(null);

        const response = await fetch(`/api/academic/course-detail?${params.toString()}`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as CourseDetail | { error: string };

        if (!response.ok) {
          throw new Error("error" in body ? body.error : "Failed to load course detail.");
        }

        const courseDetail = body as CourseDetail;
        detailCacheRef.current.set(cacheKey, courseDetail);
        setDetail(courseDetail);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setDetail(null);
        setDetailError(error instanceof Error ? error.message : "Failed to load course detail.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingDetail(false);
        }
      }
    }

    void loadDetail();

    return () => controller.abort();
  }, [analysis.courseCatalogId, items, selectedCourseId]);

  const selectedItem = items.find((item) => item.courseId === selectedCourseId) ?? null;

  return (
    <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:h-[860px] lg:overflow-y-auto">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Course planner</h2>
            <p className="mt-1 text-sm text-slate-600">
              Browse recommended and eligible courses for the next regular term.
            </p>
          </div>
          <span className="text-sm text-slate-500">{items.length} courses</span>
        </div>

        <div className="mt-4 space-y-5">
          {["Recommended next courses", "Core cleanup", "Other eligible options"].map((section) => {
            const sectionItems = items.filter((item) => item.section === section);

            if (sectionItems.length === 0) {
              return null;
            }

            return (
              <div key={section} className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {section}
                </div>
                {sectionItems.map((item) => {
                  const isSelected = item.courseId === selectedCourseId;

                  return (
                    <button
                      key={`${section}-${item.courseId}`}
                      type="button"
                      onClick={() => setSelectedCourseId(item.courseId)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? "border-orange-300 bg-orange-50 shadow-sm"
                          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-slate-900">{item.courseId}</div>
                          <div className="mt-1 text-sm text-slate-600">{item.courseName}</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${bucketBadgeClass(item.requirementBucket)}`}
                          >
                            {formatBucket(item.requirementBucket)}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${recommendationBadgeClass(item.badge)}`}
                          >
                            {item.badge}
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{item.description}</p>
                      <div className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                        {formatNextTerm(item.term)}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6 lg:max-h-[860px] lg:overflow-y-auto">
        {!selectedItem ? (
          <p className="text-sm text-slate-600">Select a course to see details.</p>
        ) : isLoadingDetail ? (
          <div className="space-y-3">
            <div className="text-sm font-medium text-slate-700">Loading course detail...</div>
            <div className="text-sm text-slate-500">Pulling description, prerequisites, and professor signals.</div>
          </div>
        ) : detailError ? (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-red-800">Could not load course detail.</div>
            <div className="text-sm text-red-700">{detailError}</div>
          </div>
        ) : detail ? (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-5">
              <div className="text-sm font-medium text-orange-700">{selectedItem.section}</div>
              <h2 className="mt-1 text-3xl font-semibold text-slate-900">
                {detail.courseId}: {detail.courseName}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${bucketBadgeClass(selectedItem.requirementBucket)}`}
                >
                  {formatBucket(selectedItem.requirementBucket)}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${recommendationBadgeClass(selectedItem.badge)}`}
                >
                  {selectedItem.badge}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-700">{selectedItem.description}</p>
            </div>

            <section>
              <h3 className="text-lg font-semibold text-slate-900">Course description</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{detail.description}</p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900">Planning snapshot</h3>
              <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Credits</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{detail.credits}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Next regular term</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{detail.nextTerm ?? "Not scheduled"}</div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{detail.gradeTendencySummary}</p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900">Prerequisites</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {detail.prerequisites.length > 0 ? (
                  detail.prerequisites.map((prerequisite) => (
                    <span
                      key={prerequisite}
                      className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                    >
                      {prerequisite}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800">
                    No listed prerequisite
                  </span>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900">Potential professors</h3>
              {detail.availableProfessors.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {detail.availableProfessors.map((professor) => (
                    <article
                      key={professor.professorName}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <a
                        href={professor.rateMyProfessorsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 transition hover:text-orange-700"
                      >
                        {professor.professorName}
                      </a>
                      <p className="mt-2 text-sm text-slate-700">
                        Rate My Professor aggregate: {professor.rateMyProfessorRating.toFixed(1)}/5
                        {" · "}
                        {professor.reviewCount} reviews
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{professor.difficultySummary}</p>
                      <p className="mt-3 text-sm text-slate-700">{professor.gradeTendencySummary}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  No professor data found for this course.
                </p>
              )}
            </section>

            <a
              href={detail.officialCourseListingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-800 transition hover:border-orange-300 hover:bg-orange-100"
            >
              Open official UT listing
            </a>
          </div>
        ) : null}
      </aside>
    </section>
  );
}
