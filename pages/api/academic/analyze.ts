import type { NextApiRequest, NextApiResponse } from "next";

import { analyzeDegree } from "../../../lib/academic/degree-engine";
import {
  loadCourseCatalogFromSource,
  loadCourseEquivalencyCatalogFromSource,
  loadImportedScheduleCatalogFromSource,
  loadNormalizedDegreePlanCatalogFromSource,
} from "../../../lib/academic/catalog-repository";
import { expandCompletedCoursesForAcademicAnalysis } from "../../../lib/academic/course-equivalencies";
import {
  findNormalizedDegreePlanForMajor,
  toDegreeRequirements,
} from "../../../lib/academic/normalized-degree-plans";
import { AcademicAnalysis, StudentProfile } from "../../../lib/types";

type AnalyzeResponse =
  | AcademicAnalysis
  | {
      error: string;
    };

function getAcademicAnalyzeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const parts = [
      typeof record.message === "string" ? record.message : null,
      typeof record.hint === "string" ? `Hint: ${record.hint}` : null,
      typeof record.code === "string" ? `Code: ${record.code}` : null,
    ].filter((value): value is string => Boolean(value));

    if (parts.length > 0) {
      return parts.join(" ");
    }
  }

  return "Unknown academic analysis error";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalyzeResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const profile = req.body?.profile as StudentProfile | undefined;

  if (!profile?.major || !profile?.currentSemester || !Array.isArray(profile?.completedCourses)) {
    return res.status(400).json({ error: "Request body must include a valid profile." });
  }

  try {
    console.log("[hook] academic analyze request", {
      major: profile.major,
      currentSemester: profile.currentSemester,
      completedCourseCount: profile.completedCourses.length,
      completedCourses: profile.completedCourses.map((course) => course.courseId),
      gpa: profile.gpa,
    });

    // Normalized undergrad plans let us keep one UT-aligned source while reusing the existing engine.
    const [planCatalog, courseEquivalencies] = await Promise.all([
      loadNormalizedDegreePlanCatalogFromSource(),
      loadCourseEquivalencyCatalogFromSource(),
    ]);
    const plan = findNormalizedDegreePlanForMajor(profile.major, planCatalog);

    if (!plan) {
      return res.status(400).json({ error: `Unsupported major: ${profile.major}` });
    }

    const [catalog, scheduleCatalog] = await Promise.all([
      loadCourseCatalogFromSource(plan.courseCatalogId),
      loadImportedScheduleCatalogFromSource(),
    ]);
    const degree = toDegreeRequirements(plan);
    const analysisProfile = expandCompletedCoursesForAcademicAnalysis(
      profile,
      plan.courseCatalogId,
      courseEquivalencies,
    );

    console.log("[hook] academic analyze normalized courses", {
      rawCompletedCourses: profile.completedCourses.map((course) => course.courseId),
      expandedCompletedCourses: analysisProfile.completedCourses.map((course) => course.courseId),
    });

    const analysis = analyzeDegree(
      analysisProfile,
      degree,
      catalog,
      scheduleCatalog,
      plan.courseCatalogId,
    );

    console.log("[hook] academic analyze result", {
      percentComplete: analysis.percentComplete,
      estimatedGraduationSemester: analysis.estimatedGraduationSemester,
      coreRecommendations: analysis.coreRecommendations.map((course) => course.courseId),
      majorRecommendations: analysis.majorRecommendations.map((course) => course.courseId),
      eligibleCourses: analysis.eligibleCourses.map((course) => course.courseId),
    });

    return res.status(200).json(analysis);
  } catch (error) {
    const message = getAcademicAnalyzeErrorMessage(error);
    console.error("[hook] academic analyze failed", error);

    return res.status(500).json({ error: message });
  }
}
