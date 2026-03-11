"use client";

import { useCallback, useEffect, useState } from "react";

import { DegreeProgressCard } from "../../components/academic/DegreeProgressCard";
import { EligibleCoursesTable } from "../../components/academic/EligibleCoursesTable";
import { PrereqAlertBanner } from "../../components/academic/PrereqAlertBanner";
import { PublicAcademicSummaryCard } from "../../components/academic/PublicAcademicSummaryCard";
import { RecommendationSection } from "../../components/academic/RecommendationSection";
import { AcademicAnalysis, StudentProfile } from "../../lib/types";

const DEMO_PROFILE: StudentProfile = {
  name: "Alex Rivera",
  major: "Computer Science",
  currentSemester: "Spring 2026",
  completedCourses: [
    { courseId: "ENGL 101", grade: "A-" },
    { courseId: "MATH 221", grade: "B+" },
    { courseId: "ECON 101", grade: "A" },
    { courseId: "CS 101", grade: "A-" },
  ],
  gpaRange: "3.5-4.0",
  gpaPublic: false,
  residency: "texas",
  financialNeed: "medium",
  resumeSummary: "CS student interested in AI, product engineering, and student tools.",
  skills: ["python", "typescript"],
  interests: ["ai", "education", "student tools"],
  careerGoal: "research",
  preferredLocations: [],
  preferredTerms: [],
  clubInterests: ["ai", "entrepreneurship"],
};

export default function AcademicPage() {
  const [analysis, setAnalysis] = useState<AcademicAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/academic/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profile: DEMO_PROFILE }),
      });

      const body = (await response.json()) as AcademicAnalysis | { error: string };

      if (!response.ok) {
        throw new Error("error" in body ? body.error : "Academic analysis request failed.");
      }

      setAnalysis(body as AcademicAnalysis);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load the academic analysis.",
      );
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // The page uses a local demo profile until the shared profile context lands.
    void loadAnalysis();
  }, [loadAnalysis]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm font-medium text-orange-700">Hook academic advisor</p>
          <h1 className="mt-1 text-3xl font-semibold">Stay on track without guesswork</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            One academic snapshot highlights progress, blocker courses, and the best next-semester options.
          </p>
        </div>

        {isLoading ? (
          <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-medium text-slate-700">Loading academic analysis...</p>
            <p className="mt-2 text-sm text-slate-500">
              Hook is ranking courses and checking prerequisite chains.
            </p>
          </section>
        ) : null}

        {!isLoading && error ? (
          <section className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <p className="text-sm font-semibold text-red-800">Could not load academic analysis.</p>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <button
              className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white"
              onClick={() => void loadAnalysis()}
              type="button"
            >
              Try again
            </button>
          </section>
        ) : null}

        {!isLoading && analysis ? (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
              <PublicAcademicSummaryCard profile={DEMO_PROFILE} summary={analysis.summary} />
              <DegreeProgressCard
                percentComplete={analysis.percentComplete}
                estimatedGraduationSemester={analysis.estimatedGraduationSemester}
              />
            </div>

            <PrereqAlertBanner alerts={analysis.prereqAlerts} />

            <div className="grid gap-6 lg:grid-cols-2">
              <RecommendationSection
                title="Core recommendations"
                recommendations={analysis.coreRecommendations}
                emptyMessage="Core requirements are in a good place right now."
              />
              <RecommendationSection
                title="Major recommendations"
                recommendations={analysis.majorRecommendations}
                emptyMessage="Major requirements are already covered for this snapshot."
              />
            </div>

            <EligibleCoursesTable courses={analysis.eligibleCourses} />
          </div>
        ) : null}
      </div>
    </main>
  );
}
