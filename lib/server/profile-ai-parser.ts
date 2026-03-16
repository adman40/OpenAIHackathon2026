import OpenAI from "openai";

import { computeNumericGpa, normalizeLetterGrade } from "../transcript/gpa";
import { buildAcademicStateFromTranscript } from "../transcript/transcript-parser";
import type { CompletedCourse } from "../types";

const SKILL_KEYWORDS = [
  "python",
  "typescript",
  "javascript",
  "react",
  "sql",
  "java",
  "c++",
  "machine learning",
  "data analysis",
  "figma",
  "product design",
  "leadership",
  "public speaking",
  "research",
] as const;

const TRANSCRIPT_OPENAI_MODEL =
  process.env.OPENAI_TRANSCRIPT_PARSER_MODEL ??
  process.env.OPENAI_PROFILE_PARSER_MODEL ??
  "gpt-4o";
const RESUME_OPENAI_MODEL =
  process.env.OPENAI_RESUME_PARSER_MODEL ??
  process.env.OPENAI_PROFILE_PARSER_MODEL ??
  "gpt-4.1-mini";

const COMMON_TRANSCRIPT_SUBJECT_HINTS = [
  "C S",
  "CS",
  "ECE",
  "E C E",
  "C C",
  "CC",
  "M",
  "MATH",
  "CH",
  "CHEM",
  "BIO",
  "BIOL",
  "PHY",
  "PHYS",
  "EE",
  "E E",
  "SDS",
  "S D S",
  "STAT",
  "ECO",
  "ECON",
  "ACC",
  "ACCT",
  "MIS",
  "FIN",
  "MAN",
  "MKT",
  "MIS",
  "B A",
  "BA",
] as const;

const MAJOR_TRANSCRIPT_SUBJECT_HINTS: Record<string, string[]> = {
  "Computer Science": ["C S", "CS", "M", "MATH", "PHY", "PHYS", "SDS", "STAT", "C C", "CC"],
  "Electrical and Computer Engineering": [
    "ECE",
    "E C E",
    "EE",
    "E E",
    "M",
    "MATH",
    "PHY",
    "PHYS",
    "CH",
    "CHEM",
  ],
  "Business Administration": ["ACC", "ACCT", "FIN", "MIS", "MKT", "MAN", "BA", "B A", "ECO", "ECON"],
  Biology: ["BIO", "BIOL", "CH", "CHEM", "M", "MATH", "PHY", "PHYS", "SDS", "STAT"],
  Mathematics: ["M", "MATH", "SDS", "STAT", "C S", "CS", "PHY", "PHYS"],
};

type TranscriptAiCourse = {
  courseId?: string;
  grade?: string;
  semester?: string | null;
  credits?: number | null;
};

type TranscriptAiPayload = {
  courses?: TranscriptAiCourse[];
  gpa?: number | null;
};

type ResumeAiPayload = {
  summary?: string;
  skills?: string[];
};

let openAIClient: OpenAI | null | undefined;

function getOpenAIClient() {
  if (openAIClient !== undefined) {
    return openAIClient;
  }

  openAIClient = process.env.OPENAI_API_KEY ? new OpenAI() : null;
  return openAIClient;
}

function clampText(text: string, maxLength = 18000) {
  return text.length <= maxLength ? text : text.slice(0, maxLength);
}

function extractJsonObject(text: string) {
  const fencedMatch = text.match(/```json\s*([\s\S]+?)```/i);
  const raw = fencedMatch?.[1] ?? text;
  const startIndex = raw.indexOf("{");
  const endIndex = raw.lastIndexOf("}");

  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    throw new Error("No JSON object found in model output.");
  }

  return JSON.parse(raw.slice(startIndex, endIndex + 1));
}

function normalizeCourseId(courseId: string) {
  const normalized = courseId
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const compactSubjectMatch = normalized.match(/^([A-Z]{1,4})(\d{3}[A-Z]?)$/);

  if (compactSubjectMatch) {
    return `${compactSubjectMatch[1]} ${compactSubjectMatch[2]}`;
  }

  const splitSubjectMatch = normalized.match(/^([A-Z](?:\s+[A-Z]){1,3})\s+(\d{3}[A-Z]?)$/);

  if (splitSubjectMatch) {
    return `${splitSubjectMatch[1].replace(/\s+/g, "")} ${splitSubjectMatch[2]}`;
  }

  return normalized;
}

function getTranscriptSubjectHints(major: string) {
  return Array.from(
    new Set([
      ...COMMON_TRANSCRIPT_SUBJECT_HINTS,
      ...(MAJOR_TRANSCRIPT_SUBJECT_HINTS[major] ?? []),
    ]),
  );
}

function normalizeGrade(grade: string) {
  return normalizeLetterGrade(grade);
}

function normalizeCompletedCourseId(courseId: string) {
  return courseId.trim().toUpperCase().replace(/\s+/g, " ");
}

function dedupeCompletedCourses(courses: CompletedCourse[]): CompletedCourse[] {
  const deduped = new Map<string, CompletedCourse>();

  for (const course of courses) {
    const normalizedCourseId = normalizeCompletedCourseId(course.courseId);
    const existingCourse = deduped.get(normalizedCourseId);

    if (!existingCourse) {
      deduped.set(normalizedCourseId, {
        ...course,
        courseId: normalizedCourseId,
      });
      continue;
    }

    const existingMetadataScore = Number(Boolean(existingCourse.semester)) + Number(Boolean(existingCourse.credits));
    const nextMetadataScore = Number(Boolean(course.semester)) + Number(Boolean(course.credits));

    if (nextMetadataScore > existingMetadataScore) {
      deduped.set(normalizedCourseId, {
        ...course,
        courseId: normalizedCourseId,
      });
    }
  }

  return Array.from(deduped.values());
}

function normalizeTranscriptCourses(courses: TranscriptAiCourse[]): CompletedCourse[] {
  return courses
    .filter((course) => course.courseId && course.grade)
    .map((course) => ({
      courseId: normalizeCourseId(course.courseId!),
      grade: normalizeGrade(course.grade!),
      semester: course.semester?.trim() || undefined,
      credits: typeof course.credits === "number" ? course.credits : undefined,
      source: "transcript_upload" as const,
    }))
    .filter((course) => course.courseId.length > 0 && course.grade.length > 0);
}

async function createJsonCompletion(prompt: string, model: string) {
  const client = getOpenAIClient();
  if (!client) {
    return null;
  }

  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "developer",
        content:
          "Extract structured JSON only. Do not add markdown. Preserve uncertainty by omitting fields you cannot support from the text.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return response.choices[0]?.message.content ?? null;
}

export async function parseTranscriptWithAi(text: string, major: string) {
  const subjectHints = getTranscriptSubjectHints(major);
  const prompt = [
    "You are reading the full raw text of a university transcript.",
    "Return JSON with this exact shape: {\"courses\":[{\"courseId\":\"SUB 123\",\"grade\":\"A\",\"semester\":\"Fall 2025\",\"credits\":3}],\"gpa\":3.75}.",
    "Parse the entire string and extract the actual completed courses and their final grades.",
    "Infer course rows from the text even if the layout is irregular.",
    "Only include courses with a recognizable course identifier and final grade.",
    "Normalize course ids to forms like 'CS 314' or 'BIO 311C'.",
    "If the transcript text splits the subject letters, such as 'C S 314', normalize that to 'CS 314'.",
    "Do not mistake letters in the course subject for the letter grade. For example, 'C S 314' is the course subject plus number, not a grade of C.",
    "A valid grade must come from the transcript's grade column or final grade text, not from the course code itself.",
    `Known subject-code hints for this transcript include: ${subjectHints.join(", ")}.`,
    "Treat those subject codes as course prefixes, not as standalone grades.",
    "Use numeric credits when visible. If GPA is not visible, return null.",
    "",
    clampText(text),
  ].join("\n");

  const raw = await createJsonCompletion(prompt, TRANSCRIPT_OPENAI_MODEL);
  if (!raw) {
    return null;
  }

  console.log("[hook] transcript ai raw output", {
    model: TRANSCRIPT_OPENAI_MODEL,
    raw,
  });

  const parsed = extractJsonObject(raw) as TranscriptAiPayload;
  const courses = normalizeTranscriptCourses(parsed.courses ?? []);

  console.log("[hook] transcript ai normalization", {
    major,
    subjectHints,
    rawCourses: parsed.courses ?? [],
    normalizedCourses: courses,
  });

  if (courses.length === 0) {
    return null;
  }

  return {
    courses,
    gpa:
      typeof parsed.gpa === "number" && Number.isFinite(parsed.gpa)
        ? Number(parsed.gpa.toFixed(2))
        : computeNumericGpa(courses),
  };
}

export async function parseTranscriptWithHybridFallback(text: string, major: string) {
  const aiResult = text ? await parseTranscriptWithAi(text, major).catch(() => null) : null;
  const deterministicResult = text ? buildAcademicStateFromTranscript(text) : null;

  if (aiResult && (!deterministicResult || aiResult.courses.length > deterministicResult.completedCourses.length)) {
    return {
      courses: aiResult.courses,
      gpa: aiResult.gpa,
      parser: "ai" as const,
      usedFallback: false,
    };
  }

  if (deterministicResult && deterministicResult.completedCourses.length > 0) {
    const mergedCourses = dedupeCompletedCourses([
      ...deterministicResult.completedCourses,
      ...(aiResult?.courses ?? []),
    ]);

    console.log("[hook] transcript deterministic fallback normalization", {
      parserVersion: deterministicResult.parserResult.sourceMetadata.parserVersion,
      deterministicCourseCount: deterministicResult.completedCourses.length,
      aiCourseCount: aiResult?.courses.length ?? 0,
      mergedCourseCount: mergedCourses.length,
      courses: mergedCourses.map((course) => course.courseId),
      gpa: deterministicResult.parserResult.reportedGpa ?? aiResult?.gpa ?? deterministicResult.gpa,
      skippedLineCount: deterministicResult.parserResult.skippedLines.length,
    });

    return {
      courses: mergedCourses,
      gpa: deterministicResult.parserResult.reportedGpa ?? aiResult?.gpa ?? deterministicResult.gpa,
      parser: "deterministic" as const,
      usedFallback: false,
    };
  }

  return {
    courses: [],
    gpa: null,
    parser: "deterministic" as const,
    usedFallback: true,
  };
}

export async function parseResumeWithAi(text: string) {
  const prompt = [
    "You are reading raw resume text.",
    "Return JSON with this exact shape: {\"summary\":\"...\",\"skills\":[\"python\",\"sql\"]}.",
    "Write a concise professional summary in 1 to 3 sentences.",
    "Extract up to 12 concrete skills, technologies, or domains actually supported by the text.",
    "Prefer canonical lowercase skill names.",
    "",
    clampText(text),
  ].join("\n");

  const raw = await createJsonCompletion(prompt, RESUME_OPENAI_MODEL);
  if (!raw) {
    return null;
  }

  const parsed = extractJsonObject(raw) as ResumeAiPayload;
  const skills = (parsed.skills ?? [])
    .map((skill) => skill.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);

  const summary = parsed.summary?.trim() ?? "";

  if (!summary && skills.length === 0) {
    return null;
  }

  return {
    summary,
    skills,
  };
}

export function parseResumeDeterministically(text: string, major: string) {
  const lower = text.toLowerCase();
  const extractedSkills = SKILL_KEYWORDS.filter((skill) => lower.includes(skill)).slice(0, 8);

  const seededSkills =
    extractedSkills.length > 0
      ? extractedSkills
      : major === "Business Administration"
        ? ["leadership", "data analysis", "public speaking"]
        : major === "Biology"
          ? ["research", "data analysis", "public speaking"]
          : ["python", "typescript", "sql"];

  return {
    skills: seededSkills,
    summary:
      text.slice(0, 320) ||
      `${major} student with a server-side resume fallback. Skills were seeded because the uploaded file could not be fully normalized yet.`,
    usedFallback: text.length === 0,
    parser: extractedSkills.length > 0 || text.length > 0 ? "deterministic" : "fallback",
  };
}
