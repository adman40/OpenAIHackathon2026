import { computeNumericGpa } from "./gpa";
import type {
  ParsedTranscriptCourse,
  TranscriptParseResult,
  TranscriptSkippedLine,
} from "../types";

const COURSE_CODE_REGEX = /\b((?:[A-Z]{1,4})|(?:[A-Z](?:\s+[A-Z]){1,3}))\s*-?\s*(\d{3}[A-Z]?)\b/;
const COURSE_NUMBER_ONLY_REGEX = /^\d{3}[A-Z]?$/;
const SUBJECT_ONLY_REGEX = /^(?:[A-Z]{1,4}|(?:[A-Z](?:\s+[A-Z]){1,3}))$/;
const GRADE_REGEX = /\b(A-|A|B\+|B-|B|C\+|C-|C|D\+|D-|D|F|CR|P|S|U|W|Q|I)\b/i;
const GRADE_REGEX_GLOBAL = /\b(A-|A|B\+|B-|B|C\+|C-|C|D\+|D-|D|F|CR|P|S|U|W|Q|I)\b/gi;
const GRADE_WITH_UNIQUE_REGEX =
  /\b(A-|A|B\+|B-|B|C\+|C-|C|D\+|D-|D|F|CR|P|S|U|W|Q|I)\b(?=\s+\d{5}\b)/i;
const FULL_TERM_REGEX = /\b(Spring|Summer|Fall|Winter)\s+(20\d{2})\b/i;
const SHORT_TERM_REGEX = /\b(SP|SU|FA|WI)\s*'?(\d{2})\b/i;
const REPORTED_GPA_REGEX = /\b(?:cumulative|cum|overall|current)?\s*gpa[:\s]+([0-4](?:\.\d{1,4})?)\b/i;
const EXPLICIT_CREDITS_REGEX = /\b([1-6](?:\.\d)?)\s*(?:credits?|credit hours|hrs?|hours)\b/i;
const TRANSCRIPT_ROW_TERMINATOR_REGEX = /^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?$/;

interface TranscriptLine {
  text: string;
  lineNumber: number;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeCourseId(subject: string, number: string): string {
  return `${subject.replace(/\s+/g, "").toUpperCase()} ${number.toUpperCase()}`;
}

function extractCourseMatch(line: string) {
  const match = line.match(COURSE_CODE_REGEX);

  if (!match || match.index === undefined) {
    return null;
  }

  return {
    fullMatch: match[0],
    subject: match[1],
    number: match[2],
    index: match.index,
  };
}

function extractCourseMatchAtStart(line: string) {
  const match = extractCourseMatch(line);
  return match && match.index <= 1 ? match : null;
}

function isSubjectOnlyLine(line: string): boolean {
  return SUBJECT_ONLY_REGEX.test(line);
}

function isCourseNumberOnlyLine(line: string): boolean {
  return COURSE_NUMBER_ONLY_REGEX.test(line);
}

function isCourseStart(lines: TranscriptLine[], index: number): boolean {
  const currentLine = lines[index];

  if (!currentLine) {
    return false;
  }

  if (extractCourseMatchAtStart(currentLine.text)) {
    return true;
  }

  const nextLine = lines[index + 1];
  return !!(
    nextLine &&
    isSubjectOnlyLine(currentLine.text) &&
    isCourseNumberOnlyLine(nextLine.text)
  );
}

function buildLogicalTranscriptLines(lines: TranscriptLine[]): TranscriptLine[] {
  const logicalLines: TranscriptLine[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const currentLine = lines[index];

    if (!currentLine) {
      continue;
    }

    if (!isCourseStart(lines, index)) {
      logicalLines.push(currentLine);
      continue;
    }

    let mergedText = currentLine.text;
    const startLineNumber = currentLine.lineNumber;

    if (
      isSubjectOnlyLine(currentLine.text) &&
      lines[index + 1] &&
      isCourseNumberOnlyLine(lines[index + 1].text)
    ) {
      mergedText = `${currentLine.text} ${lines[index + 1].text}`;
      index += 1;
    }

    while (index + 1 < lines.length) {
      const nextLine = lines[index + 1];

      if (!nextLine) {
        break;
      }

      const nextStartsCourse = isCourseStart(lines, index + 1);
      const nextStartsNewTerm =
        extractTermFromLine(nextLine.text) !== null && !extractCourseMatch(nextLine.text);

      if (nextStartsCourse || nextStartsNewTerm) {
        break;
      }

      mergedText = `${mergedText} ${nextLine.text}`;
      index += 1;

      if (TRANSCRIPT_ROW_TERMINATOR_REGEX.test(nextLine.text)) {
        break;
      }
    }

    logicalLines.push({
      text: normalizeWhitespace(mergedText),
      lineNumber: startLineNumber,
    });
  }

  return logicalLines;
}

function extractGradeAfterCourse(line: string, courseMatch: NonNullable<ReturnType<typeof extractCourseMatch>>) {
  const afterCourseText = line.slice(courseMatch.index + courseMatch.fullMatch.length);
  const afterCourseGrade =
    afterCourseText.match(GRADE_WITH_UNIQUE_REGEX) ?? afterCourseText.match(GRADE_REGEX);

  if (afterCourseGrade) {
    return afterCourseGrade[1].toUpperCase();
  }

  const beforeCourseText = line.slice(0, courseMatch.index);
  const beforeCourseGrades = Array.from(beforeCourseText.matchAll(GRADE_REGEX_GLOBAL));
  const lastBeforeCourseGrade = beforeCourseGrades[beforeCourseGrades.length - 1];

  return lastBeforeCourseGrade?.[1].toUpperCase() ?? null;
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
  const courseMatch = extractCourseMatchAtStart(line);

  if (!courseMatch) {
    return {
      rawLine: line,
      lineNumber,
      reason: "No course code found.",
    };
  }

  const grade = extractGradeAfterCourse(line, courseMatch);

  if (!grade) {
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
    courseId: normalizeCourseId(courseMatch.subject, courseMatch.number),
    grade,
    semester: inlineTerm ?? inheritedTerm ?? undefined,
    source: "transcript_upload",
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
    .map((line, index) => ({
      text: normalizeWhitespace(line),
      lineNumber: index + 1,
    }))
    .filter((line) => Boolean(line.text));
  const logicalLines = buildLogicalTranscriptLines(lines);

  const parsedCourses: ParsedTranscriptCourse[] = [];
  const skippedLines: TranscriptSkippedLine[] = [];
  let currentTerm: string | null = null;
  let reportedGpa: number | null = null;

  // The parser stays line-based and regex-driven so it is deterministic and easy to review.
  logicalLines.forEach((line) => {
    const termOnly = extractTermFromLine(line.text);
    const hasCourseCode = extractCourseMatchAtStart(line.text) !== null;
    const gpaFromLine = extractReportedGpa(line.text);

    if (gpaFromLine !== null) {
      reportedGpa = gpaFromLine;
    }

    if (termOnly && !hasCourseCode) {
      currentTerm = termOnly;
      return;
    }

    if (!hasCourseCode) {
      skippedLines.push({
        rawLine: line.text,
        lineNumber: line.lineNumber,
        reason: gpaFromLine !== null ? "Contains GPA metadata, not a course row." : "No course code found.",
      });
      return;
    }

    const parsedLine = parseTranscriptCourseLine(line.text, line.lineNumber, currentTerm);

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
      parserVersion: "hook-transcript-parser-v2",
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
