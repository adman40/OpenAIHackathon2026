import type { NextApiRequest, NextApiResponse } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { analyzeDegree } from "../../../lib/academic/degree-engine";
import { AcademicAnalysis, CourseCatalog, DegreeRequirements, StudentProfile } from "../../../lib/types";

type AnalyzeResponse =
  | AcademicAnalysis
  | {
      error: string;
    };

const MAJOR_FILE_MAP: Record<string, { degreeFile: string; catalogFile: string }> = {
  "computer science": {
    degreeFile: "cs-bscs.json",
    catalogFile: "cs-catalog.json",
  },
  "electrical and computer engineering": {
    degreeFile: "ece-bsece.json",
    catalogFile: "ece-catalog.json",
  },
  "business administration": {
    degreeFile: "business-bba.json",
    catalogFile: "business-catalog.json",
  },
  biology: {
    degreeFile: "biology-bsbi.json",
    catalogFile: "biology-catalog.json",
  },
};

function getMajorFiles(major: string) {
  return MAJOR_FILE_MAP[major.trim().toLowerCase()];
}

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

  const majorFiles = getMajorFiles(profile.major);

  if (!majorFiles) {
    return res.status(400).json({ error: `Unsupported major: ${profile.major}` });
  }

  try {
    // We read from local JSON so the demo stays deterministic and offline-friendly.
    const degree = await loadJsonFile<DegreeRequirements>([
      "data",
      "degrees",
      majorFiles.degreeFile,
    ]);
    const catalog = await loadJsonFile<CourseCatalog>([
      "data",
      "courses",
      majorFiles.catalogFile,
    ]);

    return res.status(200).json(analyzeDegree(profile, degree, catalog));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown academic analysis error";

    return res.status(500).json({ error: message });
  }
}
