import { NextResponse } from "next/server";

import { extractDocumentText } from "../../../../lib/server/document-text";
import {
  parseResumeDeterministically,
  parseResumeWithAi,
  parseTranscriptWithHybridFallback,
} from "../../../../lib/server/profile-ai-parser";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const documentType = String(formData.get("documentType") ?? "").trim();
  const major = String(formData.get("major") ?? "").trim() || "Computer Science";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing upload file." }, { status: 400 });
  }

  if (documentType !== "transcript" && documentType !== "resume") {
    return NextResponse.json({ error: "Unsupported document type." }, { status: 400 });
  }

  const extractedText = await extractDocumentText(file);

  console.log("[hook] parse-document request", {
    documentType,
    major,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    extractedTextLength: extractedText.length,
    extractedTextPreview: extractedText,
  });

  if (documentType === "transcript") {
    const transcriptResult = await parseTranscriptWithHybridFallback(extractedText, major);

    console.log("[hook] transcript parse result", {
      parser: transcriptResult.parser,
      usedFallback: transcriptResult.usedFallback,
      courseCount: transcriptResult.courses.length,
      courses: transcriptResult.courses.map((course) => course.courseId),
      gpa: transcriptResult.gpa,
    });

    return NextResponse.json({
      courses: transcriptResult.courses,
      gpa: transcriptResult.gpa,
      usedFallback: transcriptResult.usedFallback,
      extractedTextLength: extractedText.length,
      parser: transcriptResult.parser,
    });
  }

  const aiResult = extractedText ? await parseResumeWithAi(extractedText).catch(() => null) : null;
  const fallbackResult = parseResumeDeterministically(extractedText, major);

  if (aiResult) {
    console.log("[hook] resume parse result", {
      parser: "ai",
      skills: aiResult.skills,
      summaryPreview: aiResult.summary.slice(0, 240),
    });

    return NextResponse.json({
      skills: aiResult.skills,
      summary: aiResult.summary,
      usedFallback: false,
      extractedTextLength: extractedText.length,
      parser: "ai",
    });
  }

  console.log("[hook] resume parse result", {
    parser: fallbackResult.parser,
    usedFallback: fallbackResult.usedFallback,
    skills: fallbackResult.skills,
    summaryPreview: fallbackResult.summary.slice(0, 240),
  });

  return NextResponse.json({
    skills: fallbackResult.skills,
    summary: fallbackResult.summary,
    usedFallback: fallbackResult.usedFallback,
    extractedTextLength: extractedText.length,
    parser: fallbackResult.parser,
  });
}
