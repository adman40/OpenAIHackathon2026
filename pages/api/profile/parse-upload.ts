import type { NextApiRequest, NextApiResponse } from "next";

import {
  extractPdfTextFromBuffer,
  parseResumeText,
  parseTranscriptText,
} from "../../../lib/profile-upload-parsing";

type ParseKind = "transcript" | "resume";

type ParseRequestBody = {
  kind?: ParseKind;
  major?: string;
  fileName?: string;
  mimeType?: string;
  base64?: string;
};

type ParseResponse =
  | {
      courses: unknown[];
      gpa: number | null;
      usedFallback: boolean;
    }
  | {
      skills: string[];
      summary: string;
      usedFallback: boolean;
    }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ParseResponse>,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  try {
    const body = req.body as ParseRequestBody;
    const kind = body.kind;
    const major = body.major?.trim() || "Computer Science";
    const base64 = body.base64;

    if (!kind || !base64) {
      res.status(400).json({ error: "Missing parse kind or file payload." });
      return;
    }

    const pdfBuffer = Uint8Array.from(Buffer.from(base64, "base64"));
    const extractedText = await extractPdfTextFromBuffer(pdfBuffer);

    if (kind === "transcript") {
      res.status(200).json(parseTranscriptText(extractedText, major));
      return;
    }

    res.status(200).json(parseResumeText(extractedText, major));
  } catch (error) {
    console.error("Profile upload parse route failed:", error);
    res.status(500).json({ error: "Failed to parse uploaded file." });
  }
}
