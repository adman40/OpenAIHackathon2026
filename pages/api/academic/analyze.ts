import type { NextApiRequest, NextApiResponse } from "next";

import { analyzeDegree } from "../../../lib/academic/degree-engine";
import {
  findNormalizedDegreePlanForMajor,
  toDegreeRequirements,
} from "../../../lib/academic/normalized-degree-plans";
import {
  getCourseCatalog,
  getImportedCourseScheduleCatalog,
  getUndergradDegreePlanCatalog,
} from "../../../lib/academic/static-data";
import {
  AcademicAnalysis,
  StudentProfile,
} from "../../../lib/types";

type AnalyzeResponse =
  | AcademicAnalysis
  | {
      error: string;
    };

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
    const planCatalog = getUndergradDegreePlanCatalog();
    const plan = findNormalizedDegreePlanForMajor(profile.major, planCatalog);

    if (!plan) {
      return res.status(400).json({ error: `Unsupported major: ${profile.major}` });
    }

    const catalog = getCourseCatalog(plan.courseCatalogId);

    if (!catalog) {
      return res.status(500).json({ error: `Missing course catalog: ${plan.courseCatalogId}` });
    }

    const scheduleCatalog = getImportedCourseScheduleCatalog();
    const degree = toDegreeRequirements(plan);

    return res.status(200).json(
      analyzeDegree(profile, degree, catalog, scheduleCatalog, plan.courseCatalogId),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown academic analysis error";

    return res.status(500).json({ error: message });
  }
}
