import { promises as fs } from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";

import { matchOpportunities } from "../../../lib/matchers/opportunity-matcher";
import type { Opportunity, OpportunityMatch, StudentProfile } from "../../../lib/types";

type MatchResponse = { matches: OpportunityMatch[] } | { error: string };

async function readInternships(): Promise<Opportunity[]> {
  const importedPath = path.join(process.cwd(), "data", "opportunities", "internships-imported.json");
  const defaultPath = path.join(process.cwd(), "data", "opportunities", "internships.json");
  let raw: string;
  try {
    raw = await fs.readFile(importedPath, "utf8");
  } catch {
    raw = await fs.readFile(defaultPath, "utf8");
  }
  return JSON.parse(raw) as Opportunity[];
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

    const opportunities = await readInternships();
    const matches = matchOpportunities(profile, opportunities);
    res.status(200).json({ matches });
  } catch (error) {
    console.error("Internship match route failed:", error);
    res.status(500).json({ error: "Failed to match internships." });
  }
}
