import type { NextApiRequest, NextApiResponse } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { analyzeDegree } from "../../../lib/academic/degree-engine";
import { expandCompletedCoursesForAcademicAnalysis } from "../../../lib/academic/course-equivalencies";
import {
  findNormalizedDegreePlanForMajor,
  toDegreeRequirements,
} from "../../../lib/academic/normalized-degree-plans";
import {
  AcademicAnalysis,
  CourseCatalog,
  ImportedCourseScheduleCatalog,
  NormalizedDegreePlanCatalog,
  StudentProfile,
} from "../../../lib/types";

type AnalyzeResponse =
  | AcademicAnalysis
  | {
      error: string;
    };

async function loadJsonFile<T>(segments: string[]): Promise<T> {
  const filePath = path.join(process.cwd(), ...segments);
  const fileContents = await readFile(filePath, "utf8");

  return JSON.parse(fileContents) as T;
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
    const planCatalog = await loadJsonFile<NormalizedDegreePlanCatalog>([
      "data",
      "ut",
      "undergrad-degree-plans.json",
    ]);
    const plan = findNormalizedDegreePlanForMajor(profile.major, planCatalog);

    if (!plan) {
      return res.status(400).json({ error: `Unsupported major: ${profile.major}` });
    }

    const catalog = await loadJsonFile<CourseCatalog>([
      "data",
      "courses",
      `${plan.courseCatalogId}.json`,
    ]);
    const scheduleCatalog = await loadJsonFile<ImportedCourseScheduleCatalog>([
      "data",
      "ut",
      "course-schedule.json",
    ]);
    const degree = toDegreeRequirements(plan);
    const analysisProfile = expandCompletedCoursesForAcademicAnalysis(profile, plan.courseCatalogId);

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
    const message =
      error instanceof Error ? error.message : "Unknown academic analysis error";

    return res.status(500).json({ error: message });
  }
}
