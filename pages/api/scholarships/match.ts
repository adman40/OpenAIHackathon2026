import { promises as fs } from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";

import { matchScholarships } from "../../../lib/matchers/scholarship-matcher";
import type { Scholarship, ScholarshipMatch, StudentProfile } from "../../../lib/types";

type MatchResponse =
  | { matches: ScholarshipMatch[] }
  | { error: string };

const MAX_VISIBLE_MATCHES = 200;

async function readScholarships(): Promise<Scholarship[]> {
  const lassoDataPath = path.join(
    process.cwd(),
    "data",
    "scholarships",
    "ut-lasso-scholarships.json",
  );
  const legacyDataPath = path.join(
    process.cwd(),
    "data",
    "scholarships",
    "scholarships.json",
  );

  let raw: string;
  try {
    raw = await fs.readFile(lassoDataPath, "utf8");
  } catch {
    raw = await fs.readFile(legacyDataPath, "utf8");
  }

  return JSON.parse(raw) as Scholarship[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MatchResponse>,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  try {
    const profile = req.body?.profile as StudentProfile | undefined;
    if (!profile) {
      res.status(400).json({ error: "Missing profile in request body." });
      return;
    }

    const scholarships = await readScholarships();
    const matches = matchScholarships(profile, scholarships).slice(0, MAX_VISIBLE_MATCHES);
    res.status(200).json({ matches });
  } catch (error) {
    console.error("Scholarship match route failed:", error);
    res.status(500).json({ error: "Failed to match scholarships." });
  }
}
