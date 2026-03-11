import type { NextApiRequest, NextApiResponse } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { matchClubs } from "../../../lib/matchers/club-matcher";
import { Club, ClubMatch, StudentProfile } from "../../../lib/types";

type ClubsResponse =
  | ClubMatch[]
  | {
      error: string;
    };

async function loadClubs(): Promise<Club[]> {
  const hornslinkPath = path.join(process.cwd(), "data", "clubs", "hornslink-clubs.json");
  const defaultPath = path.join(process.cwd(), "data", "clubs", "clubs.json");
  let fileContents: string;

  try {
    fileContents = await readFile(hornslinkPath, "utf8");
  } catch {
    fileContents = await readFile(defaultPath, "utf8");
  }

  return JSON.parse(fileContents) as Club[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ClubsResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const profile = req.body?.profile as StudentProfile | undefined;

  if (
    !profile?.major ||
    !Array.isArray(profile?.interests) ||
    !Array.isArray(profile?.clubInterests)
  ) {
    return res.status(400).json({ error: "Request body must include a valid profile." });
  }

  try {
    const clubs = await loadClubs();
    return res.status(200).json(matchClubs(profile, clubs));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown club matching error";
    return res.status(500).json({ error: message });
  }
}
