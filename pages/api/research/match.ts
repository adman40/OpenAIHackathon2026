import { promises as fs } from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";

import { matchOpportunities } from "../../../lib/matchers/opportunity-matcher";
import type { Opportunity, OpportunityMatch, StudentProfile } from "../../../lib/types";

type MatchResponse = { matches: OpportunityMatch[] } | { error: string };

async function readResearchOpportunities(): Promise<Opportunity[]> {
  const filePath = path.join(process.cwd(), "data", "opportunities", "research.json");
  const raw = await fs.readFile(filePath, "utf8");
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

    const opportunities = await readResearchOpportunities();
    const matches = matchOpportunities(profile, opportunities);
    res.status(200).json({ matches });
  } catch (error) {
    console.error("Research match route failed:", error);
    res.status(500).json({ error: "Failed to match research opportunities." });
  }
}
