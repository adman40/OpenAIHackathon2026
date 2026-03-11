import { buildSeedCourses } from "./profile-utils";
import type { CompletedCourse } from "./types";

const RESUME_SKILL_ALIASES = [
  "python",
  "typescript",
  "javascript",
  "react",
  "next.js",
  "nextjs",
  "sql",
  "postgresql",
  "mysql",
  "java",
  "c",
  "c++",
  "assembly",
  "r",
  "rstudio",
  "excel",
  "aws",
  "docker",
  "django",
  "git",
  "gdb",
  "junit",
  "verilog",
  "qemu",
  "machine learning",
  "data analysis",
  "backend systems",
  "concurrency",
  "cpu architecture",
  "operating systems",
  "performance benchmarking",
  "product design",
  "leadership",
  "public speaking",
  "research",
];

const GRADE_LINE_REGEX = /^(A-|A|B\+|B|B-|C\+|C|C-|D\+|D|D-|F|CR|P|S|U|W|Q|I)$/i;
const TERM_HEADER_REGEX = /^(Spring|Summer|Fall|Winter)\s+\d{4}\s+Courses$/i;
const COURSE_LINE_REGEX = /^((?:[A-Z]\s*){1,4})\s*(\d{3}[A-Z]?)$/;
const CREDIT_LINE_REGEX = /^\d(?:\.\d{1,2})?$/;
const ALL_CAPS_SECTION_REGEX = /^[A-Z][A-Z &/+-]{2,}$/;
const TRANSCRIPT_ROW_REGEX =
  /^(.*?)\s+(A-|A|B\+|B|B-|C\+|C|C-|D\+|D|D-|F|CR|P|S|U|W|Q|I)\s+(\d{1,5})\s+(Transfer|Extension|In residence|Credit by exam|Credit by|exam)\s+(\d(?:\.\d{1,2})?)\s+(\d+\.\d{2})$/i;
const IN_PROGRESS_ROW_REGEX =
  /^(.*?)\s+(\d{1,5})\s+(Transfer|Extension|In residence|Credit by exam|Credit by|exam)\s+(\d(?:\.\d{1,2})?)\s+0\.00$/i;

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function extractReportedOverallGpa(rawText: string): number | null {
  const blockMatches = [
    ...rawText.matchAll(
      /GPA Hours:\s*([0-9]+(?:\.\d+)?)\s*Grade Points:\s*[0-9]+(?:\.\d+)?\s*GPA:\s*([0-4](?:\.\d{1,4})?)/gi,
    ),
  ];

  if (blockMatches.length > 0) {
    const bestMatch = blockMatches
      .map((match) => ({
        gpaHours: Number(match[1]),
        gpa: Number(match[2]),
      }))
      .filter((entry) => Number.isFinite(entry.gpaHours) && Number.isFinite(entry.gpa))
      .sort((left, right) => right.gpaHours - left.gpaHours)[0];

    if (bestMatch) {
      return Number(bestMatch.gpa.toFixed(2));
    }
  }

  const allMatches = [...rawText.matchAll(/GPA:\s*([0-4](?:\.\d{1,4})?)/gi)];
  if (allMatches.length === 0) {
    return null;
  }

  const value = Number(allMatches.at(-1)?.[1] ?? "");
  return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
}

function normalizeTranscriptCourseId(subject: string, number: string) {
  return `${subject.replace(/\s+/g, "").toUpperCase()} ${number.toUpperCase()}`;
}

function isMetadataLine(line: string) {
  return (
    /^Academic Summary/i.test(line) ||
    /^Unofficial Document/i.test(line) ||
    /^Page \d+ of \d+/i.test(line) ||
    /^Course$/i.test(line) ||
    /^Title$/i.test(line) ||
    /^Grade$/i.test(line) ||
    /^Unique$/i.test(line) ||
    /^Type$/i.test(line) ||
    /^Credit Hours Grade Points$/i.test(line) ||
    /^The University of Texas at Austin$/i.test(line) ||
    /^EID:/i.test(line) ||
    /^Name:/i.test(line) ||
    /^School \d:/i.test(line) ||
    /^Major \d:/i.test(line) ||
    /^Classification:/i.test(line) ||
    /^First Semester Enrolled:/i.test(line) ||
    /^Last Semester Enrolled:/i.test(line) ||
    /^Date Degree Expected:/i.test(line)
  );
}

function looksLikeTypeOrAuxiliaryLine(line: string) {
  return (
    /^(Transfer|Extension|In residence|Credit by|exam|Study abroad)$/i.test(line) ||
    /^\d{1,5}$/.test(line) ||
    /^\d+\.\d{2}$/.test(line)
  );
}

function inferInProgressCredits(lines: string[], startIndex: number) {
  let sawTypeLine = false;
  let credits: number | undefined;

  for (let lookahead = startIndex + 1; lookahead < Math.min(startIndex + 10, lines.length); lookahead += 1) {
    const candidate = lines[lookahead];

    if (TERM_HEADER_REGEX.test(candidate) || candidate.match(COURSE_LINE_REGEX)) {
      break;
    }

    if (/^(Transfer|Extension|In residence|Credit by exam|Credit by|exam)$/i.test(candidate)) {
      sawTypeLine = true;
      continue;
    }

    if (sawTypeLine && credits === undefined && CREDIT_LINE_REGEX.test(candidate)) {
      const numericCredits = Number(candidate);

      if (numericCredits > 0) {
        credits = numericCredits;
      }
      continue;
    }

    if (sawTypeLine && credits !== undefined && /^0+\.\d{2}$/.test(candidate)) {
      return credits;
    }
  }

  return undefined;
}

export async function extractPdfTextFromBuffer(buffer: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: buffer,
    useWorkerFetch: false,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const rows = new Map<number, Array<{ x: number; text: string }>>();

    for (const item of textContent.items as Array<{ str?: string; transform?: number[] }>) {
      const text = normalizeWhitespace(item.str ?? "");
      const transform = item.transform ?? [];

      if (!text || transform.length < 6) {
        continue;
      }

      const x = transform[4] ?? 0;
      const y = Math.round(transform[5] ?? 0);
      const currentRow = rows.get(y) ?? [];
      currentRow.push({ x, text });
      rows.set(y, currentRow);
    }

    const pageLines = [...rows.entries()]
      .sort((left, right) => right[0] - left[0])
      .map(([, entries]) =>
        entries
          .sort((left, right) => left.x - right.x)
          .map((entry) => entry.text)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter(Boolean);

    pages.push(pageLines.join("\n"));
  }

  return pages.join("\n");
}

export function parseTranscriptText(rawText: string, major: string) {
  const sourceLines = rawText
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
  const lines: string[] = [];

  for (let index = 0; index < sourceLines.length; index += 1) {
    const current = sourceLines[index];
    const next = sourceLines[index + 1];

    if (/^[A-Z]{1,4}$/.test(current) && next && /^\d{3}[A-Z]?\b/.test(next)) {
      lines.push(`${current} ${next}`);
      index += 1;
      continue;
    }

    lines.push(current);
  }

  const courses: CompletedCourse[] = [];
  let currentTerm: string | undefined;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (TERM_HEADER_REGEX.test(line)) {
      currentTerm = line.replace(/\s+Courses$/i, "");
      continue;
    }

    if (isMetadataLine(line)) {
      continue;
    }

    const courseMatch = line.match(/\b((?:[A-Z]\s*){1,4})\s*(\d{3}[A-Z]?)\b/);

    if (!courseMatch) {
      continue;
    }

    let grade: string | undefined = undefined;
    let credits: number | undefined = undefined;
    const rowMatch = line.match(TRANSCRIPT_ROW_REGEX);

    if (rowMatch) {
      grade = rowMatch[2].toUpperCase();
      const numericCredits = Number(rowMatch[5]);
      if (numericCredits > 0) {
        credits = numericCredits;
      }
    }

    if (!grade) {
      const inProgressRowMatch = line.match(IN_PROGRESS_ROW_REGEX);

      if (inProgressRowMatch) {
        grade = "IP";
        const numericCredits = Number(inProgressRowMatch[4]);

        if (numericCredits > 0) {
          credits = numericCredits;
        }
      }
    }

    if (!grade) {
      for (let lookahead = index + 1; lookahead < Math.min(index + 10, lines.length); lookahead += 1) {
        const candidate = lines[lookahead];

        if (TERM_HEADER_REGEX.test(candidate) || candidate.match(COURSE_LINE_REGEX)) {
          break;
        }

        if (!grade && GRADE_LINE_REGEX.test(candidate)) {
          grade = candidate.toUpperCase();
          continue;
        }

        if (grade && credits === undefined && CREDIT_LINE_REGEX.test(candidate)) {
          const numericCredits = Number(candidate);
          if (numericCredits > 0) {
            credits = numericCredits;
            break;
          }
        }

        if (looksLikeTypeOrAuxiliaryLine(candidate)) {
          continue;
        }
      }
    }

    if (!grade) {
      const inProgressCredits = inferInProgressCredits(lines, index);

      if (inProgressCredits !== undefined) {
        grade = "IP";
        credits = inProgressCredits;
      }
    }

    if (!grade) {
      continue;
    }

    courses.push({
      courseId: normalizeTranscriptCourseId(courseMatch[1], courseMatch[2]),
      grade,
      semester: currentTerm,
      credits,
      source: "transcript_upload",
    });
  }

  const dedupedCourses = Array.from(
    new Map(courses.map((course) => [course.courseId, course])).values(),
  );
  const reportedGpa = extractReportedOverallGpa(rawText);

  if (dedupedCourses.length === 0) {
    const seededCourses = buildSeedCourses(major).map((course) => ({
      ...course,
      source: "transcript_upload" as const,
    }));

    return {
      courses: seededCourses,
      gpa: reportedGpa,
      usedFallback: true,
    };
  }

  return {
    courses: dedupedCourses,
    gpa: reportedGpa,
    usedFallback: false,
  };
}

function extractResumeSections(rawText: string) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sections = new Map<string, string[]>();
  let currentSection = "HEADER";

  for (const line of lines) {
    if (ALL_CAPS_SECTION_REGEX.test(line) && line.length < 40) {
      currentSection = line;
      if (!sections.has(currentSection)) {
        sections.set(currentSection, []);
      }
      continue;
    }

    const current = sections.get(currentSection) ?? [];
    current.push(line);
    sections.set(currentSection, current);
  }

  return sections;
}

function extractResumeSkills(rawText: string) {
  const lower = rawText.toLowerCase();
  const skills = RESUME_SKILL_ALIASES.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9+])${escaped}([^a-z0-9+]|$)`, "i").test(lower);
  });

  return Array.from(new Set(skills)).slice(0, 12);
}

function buildResumeSummary(rawText: string, major: string) {
  const sections = extractResumeSections(rawText);
  const education = sections.get("EDUCATION") ?? [];
  const skillsSection = sections.get("SKILLS") ?? [];
  const projects = sections.get("TECHNICAL PROJECTS") ?? [];

  const degreeLine =
    education.find((line) => /Bachelor|Master|B\.S\.|Bachelors/i.test(line)) ??
    `${major} student`;
  const courseworkLine = education.find((line) => /Relevant Coursework:/i.test(line));
  const topProjectLine = projects.find(
    (line) => !line.startsWith("•") && !/^(Spring|Summer|Fall|Winter)\s+\d{4}$/i.test(line),
  );
  const skillsLine = skillsSection.find((line) => /Languages|Tools|Technical Fundamentals/i.test(line));

  return [
    degreeLine.replace(/^•\s*/, ""),
    courseworkLine?.replace(/^•\s*/, ""),
    topProjectLine ? `Top project: ${topProjectLine.replace(/^•\s*/, "")}.` : null,
    skillsLine?.replace(/^•\s*/, ""),
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 500);
}

export function parseResumeText(rawText: string, major: string) {
  const text = rawText.replace(/\u2022/g, "\n• ").replace(/\s+\n/g, "\n").trim();
  const skills = extractResumeSkills(text);

  if (!text) {
    const seededSkills =
      major === "Business Administration"
        ? ["leadership", "data analysis", "public speaking"]
        : major === "Biology"
          ? ["research", "data analysis", "public speaking"]
          : ["python", "typescript", "sql"];

    return {
      skills: seededSkills,
      summary: `${major} student with a browser-safe resume fallback. Skills were seeded so the demo stays coherent when the uploaded file is not text-readable yet.`,
      usedFallback: true,
    };
  }

  return {
    skills: skills.length > 0 ? skills : ["python", "typescript", "sql"],
    summary:
      buildResumeSummary(text, major) ||
      `${major} student resume parsed into an editable profile draft.`,
    usedFallback: false,
  };
}
