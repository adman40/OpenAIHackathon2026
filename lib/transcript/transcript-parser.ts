import { computeNumericGpa } from "./gpa";
import type {
  ParsedTranscriptCourse,
  TranscriptParseResult,
  TranscriptSkippedLine,
} from "../types";

const COURSE_CODE_REGEX = /\b([A-Z]{1,4})\s*-?\s*(\d{3}[A-Z]?)\b/;
const GRADE_REGEX = /\b(A-|A|B\+|B-|B|C\+|C-|C|D\+|D-|D|F|CR|P|S|U|W|Q|I)\b/i;
const FULL_TERM_REGEX = /\b(Spring|Summer|Fall|Winter)\s+(20\d{2})\b/i;
const SHORT_TERM_REGEX = /\b(SP|SU|FA|WI)\s*'?(\d{2})\b/i;
const REPORTED_GPA_REGEX = /\b(?:cumulative|cum|overall|current)?\s*gpa[:\s]+([0-4](?:\.\d{1,3})?)\b/i;
const EXPLICIT_CREDITS_REGEX = /\b([1-6](?:\.\d)?)\s*(?:credits?|credit hours|hrs?|hours)\b/i;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeCourseId(subject: string, number: string): string {
  return `${subject.toUpperCase()} ${number.toUpperCase()}`;
}

function extractTermFromLine(line: string): string | null {
  const fullMatch = line.match(FULL_TERM_REGEX);

  if (fullMatch) {
    return `${fullMatch[1][0].toUpperCase()}${fullMatch[1].slice(1).toLowerCase()} ${fullMatch[2]}`;
  }

  const shortMatch = line.match(SHORT_TERM_REGEX);

  if (!shortMatch) {
    return null;
  }

  const seasonMap: Record<string, string> = {
    SP: "Spring",
    SU: "Summer",
    FA: "Fall",
    WI: "Winter",
  };

  return `${seasonMap[shortMatch[1].toUpperCase()]} 20${shortMatch[2]}`;
}

function extractReportedGpa(line: string): number | null {
  const match = line.match(REPORTED_GPA_REGEX);

  if (!match) {
    return null;
  }

  return Number(match[1]);
}

function extractCredits(line: string): number | undefined {
  const explicitMatch = line.match(EXPLICIT_CREDITS_REGEX);

  if (!explicitMatch) {
    return undefined;
  }

  return Number(explicitMatch[1]);
}

function parseTranscriptCourseLine(
  line: string,
  lineNumber: number,
  inheritedTerm: string | null,
): ParsedTranscriptCourse | TranscriptSkippedLine {
  const courseMatch = line.match(COURSE_CODE_REGEX);

  if (!courseMatch) {
    return {
      rawLine: line,
      lineNumber,
      reason: "No course code found.",
    };
  }

  const gradeMatch = line.match(GRADE_REGEX);

  if (!gradeMatch) {
    return {
      rawLine: line,
      lineNumber,
      reason: "No reviewable letter grade found.",
    };
  }

  const inlineTerm = extractTermFromLine(line);
  const parseWarnings: string[] = [];

  if (!inlineTerm && !inheritedTerm) {
    parseWarnings.push("No term found on this line.");
  }

  return {
    courseId: normalizeCourseId(courseMatch[1], courseMatch[2]),
    grade: gradeMatch[1].toUpperCase(),
    semester: inlineTerm ?? inheritedTerm ?? undefined,
    credits: extractCredits(line),
    rawLine: line,
    lineNumber,
    confidence: inlineTerm || inheritedTerm ? "high" : "medium",
    parseWarnings,
  };
}

export function parseTranscriptSummaryText(summaryText: string): TranscriptParseResult {
  const lines = summaryText
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  const parsedCourses: ParsedTranscriptCourse[] = [];
  const skippedLines: TranscriptSkippedLine[] = [];
  let currentTerm: string | null = null;
  let reportedGpa: number | null = null;

  // The parser stays line-based and regex-driven so it is deterministic and easy to review.
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const termOnly = extractTermFromLine(line);
    const hasCourseCode = COURSE_CODE_REGEX.test(line);
    const gpaFromLine = extractReportedGpa(line);

    if (gpaFromLine !== null) {
      reportedGpa = gpaFromLine;
    }

    if (termOnly && !hasCourseCode) {
      currentTerm = termOnly;
      return;
    }

    if (!hasCourseCode) {
      skippedLines.push({
        rawLine: line,
        lineNumber,
        reason: gpaFromLine !== null ? "Contains GPA metadata, not a course row." : "No course code found.",
      });
      return;
    }

    const parsedLine = parseTranscriptCourseLine(line, lineNumber, currentTerm);

    if ("courseId" in parsedLine) {
      parsedCourses.push(parsedLine);
      return;
    }

    skippedLines.push(parsedLine);
  });

  return {
    parsedCourses,
    skippedLines,
    reportedGpa,
    computedGpa: computeNumericGpa(parsedCourses),
    sourceMetadata: {
      parserVersion: "hook-transcript-parser-v1",
      parsedAt: new Date().toISOString(),
    },
  };
}

export function buildAcademicStateFromTranscript(summaryText: string): {
  completedCourses: ParsedTranscriptCourse[];
  gpa: number | null;
  parserResult: TranscriptParseResult;
} {
  const parserResult = parseTranscriptSummaryText(summaryText);

  return {
    completedCourses: parserResult.parsedCourses,
    gpa: parserResult.reportedGpa ?? parserResult.computedGpa,
    parserResult,
  };
}
