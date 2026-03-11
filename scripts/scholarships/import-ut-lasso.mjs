#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { load } from "cheerio";

const SOURCE_URL = "https://utexas.scholarships.ngwebsolutions.com/Scholarships/Search";
const YEAR_WORDS = ["freshman", "sophomore", "junior", "senior", "undergraduate", "transfer"];

const MAJOR_KEYWORDS = [
  "computer science",
  "data science",
  "informatics",
  "engineering",
  "business",
  "accounting",
  "finance",
  "economics",
  "biology",
  "biochemistry",
  "chemistry",
  "physics",
  "mathematics",
  "statistics",
  "education",
  "social work",
  "government",
  "public policy",
  "music",
  "art",
  "architecture",
  "journalism",
  "communications",
  "nursing",
  "geology",
  "geoscience",
];

const QUALITY_KEYWORDS = [
  "leadership",
  "service",
  "community",
  "research",
  "innovation",
  "entrepreneurship",
  "academic achievement",
  "merit",
  "financial need",
  "volunteer",
  "mentorship",
  "first generation",
  "diversity",
  "inclusion",
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 100);
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function extractAmount(text) {
  const matches = [...text.matchAll(/\$\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d+)?|[0-9]+(?:\.\d+)?)/g)];
  if (matches.length === 0) {
    return 0;
  }

  const numeric = matches
    .map((match) => Number(match[1].replace(/,/g, "")))
    .filter((value) => Number.isFinite(value));

  return numeric.length > 0 ? Math.max(...numeric) : 0;
}

function monthToNumber(month) {
  const map = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  };

  return map[month.toLowerCase()] ?? null;
}

function toIsoDate(year, month, day) {
  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function parseDeadline(text, importDate) {
  const lower = text.toLowerCase();

  const fullDateMatches = [...text.matchAll(/(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12][0-9]|3[01])[\/\-](20\d{2})/g)];
  if (fullDateMatches.length > 0) {
    const parsed = fullDateMatches
      .map((match) => toIsoDate(Number(match[3]), Number(match[1]), Number(match[2])))
      .filter(Boolean)
      .sort();
    if (parsed.length > 0) {
      return parsed[0];
    }
  }

  const monthNameMatches = [...lower.matchAll(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),\s*(20\d{2})/g)];
  if (monthNameMatches.length > 0) {
    const parsed = monthNameMatches
      .map((match) => toIsoDate(Number(match[3]), monthToNumber(match[1]), Number(match[2])))
      .filter(Boolean)
      .sort();
    if (parsed.length > 0) {
      return parsed[0];
    }
  }

  const shortDateMatches = [...text.matchAll(/(?:deadline[^\d]{0,20}|by\s*)(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12][0-9]|3[01])(?![\/\-]\d)/gi)];
  if (shortDateMatches.length > 0) {
    const importYear = importDate.getUTCFullYear();
    const parsed = shortDateMatches
      .map((match) => {
        const month = Number(match[1]);
        const day = Number(match[2]);
        const isoCurrent = toIsoDate(importYear, month, day);
        if (!isoCurrent) {
          return null;
        }

        const current = new Date(`${isoCurrent}T00:00:00Z`);
        if (current.getTime() + 45 * 24 * 60 * 60 * 1000 < importDate.getTime()) {
          return toIsoDate(importYear + 1, month, day);
        }
        return isoCurrent;
      })
      .filter(Boolean)
      .sort();

    if (parsed.length > 0) {
      return parsed[0];
    }
  }

  return "2099-12-31";
}

function containsAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function extractYears(text) {
  const years = [];
  const lower = text.toLowerCase();

  YEAR_WORDS.forEach((word) => {
    if (lower.includes(word)) {
      years.push(word);
    }
  });

  if (years.includes("undergraduate") && !years.some((entry) => entry === "freshman" || entry === "sophomore" || entry === "junior" || entry === "senior")) {
    years.push("freshman", "sophomore", "junior", "senior");
  }

  return [...new Set(years.filter((entry) => entry !== "undergraduate" && entry !== "transfer"))];
}

function extractMajors(text) {
  const lower = text.toLowerCase();
  return MAJOR_KEYWORDS.filter((major) => lower.includes(major));
}

function extractMinGpa(text) {
  const matches = [
    ...text.matchAll(/(?:minimum|min\.?|at least|maintain)[^\n\r.]{0,40}\b([2-4](?:\.\d{1,2})?)\s*gpa\b/gi),
    ...text.matchAll(/\b([2-4](?:\.\d{1,2})?)\s*gpa\b[^\n\r.]{0,30}(?:minimum|min\.?|or higher|required)/gi),
  ];
  if (matches.length === 0) {
    return null;
  }

  const values = matches
    .map((match) => Number(match[1]))
    .filter((value) => value >= 2 && value <= 4);

  return values.length > 0 ? Math.max(...values) : null;
}

function extractMinCreditHours(text) {
  const matches = [...text.matchAll(/(?:minimum|min\.?|at least)[^\n\r.]{0,30}\b(\d{1,3})\s+(?:credit|semester)\s*hours?/gi)];
  if (matches.length === 0) {
    return undefined;
  }

  const values = matches
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value));

  return values.length > 0 ? Math.max(...values) : undefined;
}

function extractMinWorkHours(text) {
  const matches = [...text.matchAll(/(?:at least|minimum|min\.?)[^\n\r.]{0,30}\b(\d{1,2})\s+hours?\s+per\s+week/gi)];
  if (matches.length === 0) {
    return undefined;
  }

  const values = matches
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value));

  return values.length > 0 ? Math.max(...values) : undefined;
}

function extractCriteria(text) {
  const lower = text.toLowerCase();
  const years = extractYears(text);
  const majors = extractMajors(text);
  const minGpa = extractMinGpa(text);
  const minCreditHours = extractMinCreditHours(text);
  const minWorkHoursPerWeek = extractMinWorkHours(text);

  const residency = [];
  if (containsAny(lower, [/texas resident/, /resident of texas/, /tx resident/])) {
    residency.push("texas");
  }
  if (containsAny(lower, [/out-?of-?state/])) {
    residency.push("out-of-state");
  }
  if (containsAny(lower, [/international student/, /non-?us citizen/, /foreign student/])) {
    residency.push("international");
  }

  const needBased = containsAny(lower, [/financial need/, /need-?based/, /demonstrated need/]);
  const fullTimeRequired = containsAny(lower, [/full-?time enrollment/, /enrolled full-?time/]);

  const keywords = QUALITY_KEYWORDS.filter((keyword) => lower.includes(keyword));

  return {
    minGpa: minGpa ?? undefined,
    residency,
    majors,
    years,
    needBased,
    fullTimeRequired,
    minCreditHours,
    minWorkHoursPerWeek,
    keywords,
  };
}

function toEligibilitySignals(criteria) {
  const signals = [];

  if (criteria.residency.length > 0) {
    signals.push(`Residency: ${criteria.residency.join(", ")}`);
  }
  if (criteria.majors.length > 0) {
    signals.push(`Majors: ${criteria.majors.join(", ")}`);
  }
  if (criteria.years.length > 0) {
    signals.push(`Years: ${criteria.years.join(", ")}`);
  }
  if (typeof criteria.minGpa === "number") {
    signals.push(`Min GPA: ${criteria.minGpa.toFixed(2)}`);
  }
  if (criteria.needBased) {
    signals.push("Need: need-based preference");
  }
  if (criteria.fullTimeRequired) {
    signals.push("Enrollment: full-time required");
  }
  if (typeof criteria.minCreditHours === "number") {
    signals.push(`Min credit hours: ${criteria.minCreditHours}`);
  }
  if (typeof criteria.minWorkHoursPerWeek === "number") {
    signals.push(`Min hours per week: ${criteria.minWorkHoursPerWeek}`);
  }

  return signals;
}

function summarizeSubmission(text, applyLink) {
  const sentences = normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  const targeted = sentences.filter((sentence) =>
    /apply|application|submit|deadline|contact|essay|recommendation|form/i.test(sentence),
  );

  const summary = targeted.slice(0, 3).join(" ");
  if (summary.length > 0) {
    return summary.slice(0, 600);
  }

  if (applyLink) {
    return "Apply through the official scholarship link for complete submission instructions.";
  }

  return "Review the scholarship description and linked source for submission instructions.";
}

function cleanName(name) {
  return normalizeWhitespace(name.replace(/\s+Aug\s+\d{1,2}\s+\d{4}\s+\d{1,2}:\d{2}\s*[AP]M$/i, ""));
}

function normalizeOfficialLink(rawLink) {
  const candidate = rawLink.trim();
  if (!candidate) {
    return SOURCE_URL;
  }
  if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
    return candidate;
  }
  if (candidate.startsWith("/")) {
    return `https://utexas.scholarships.ngwebsolutions.com${candidate}`;
  }
  return SOURCE_URL;
}

async function main() {
  const importDate = new Date();
  const importTimestamp = importDate.toISOString();

  const response = await fetch(SOURCE_URL, {
    headers: {
      "User-Agent": "hook-scholarship-importer/1.0",
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch UT Lasso scholarships: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = load(html);

  const seenIds = new Set();
  const scholarships = [];

  $("#results .result").each((index, node) => {
    const nameRaw = $(node).find("h3").first().text();
    const name = cleanName(nameRaw);
    if (!name) {
      return;
    }

    const description = normalizeWhitespace($(node).find(".ng-force-wrap").first().text());
    const applyHref = $(node).find("a.btn.btn-primary").first().attr("href")?.trim() ?? "";
    const titleHref = $(node).find("h3 a").first().attr("href")?.trim() ?? "";

    const link = normalizeOfficialLink(applyHref || titleHref || SOURCE_URL);
    const amount = extractAmount(description);
    const criteria = extractCriteria(description);
    const eligibilitySignals = toEligibilitySignals(criteria);
    const favoredQualities = QUALITY_KEYWORDS.filter((keyword) => description.toLowerCase().includes(keyword));

    const baseId = `ut-lasso-${slugify(name) || `record-${index + 1}`}`;
    let id = baseId;
    let suffix = 2;
    while (seenIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    seenIds.add(id);

    scholarships.push({
      id,
      name,
      amount,
      description: description || "No description available in UT Lasso listing.",
      eligibilitySignals,
      eligibilityCriteria: {
        ...criteria,
        residency: criteria.residency,
      },
      favoredQualities,
      deadline: parseDeadline(description, importDate),
      submissionDetails: summarizeSubmission(description, link),
      link,
      importTimestamp,
    });
  });

  scholarships.sort((a, b) => a.name.localeCompare(b.name));

  const root = process.cwd();
  const dataDir = path.join(root, "data", "scholarships");
  const lassoPath = path.join(dataDir, "ut-lasso-scholarships.json");
  const defaultPath = path.join(dataDir, "scholarships.json");
  const metadataPath = path.join(dataDir, "ut-lasso-import-metadata.json");

  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(lassoPath, `${JSON.stringify(scholarships, null, 2)}\n`, "utf8");
  await fs.writeFile(defaultPath, `${JSON.stringify(scholarships, null, 2)}\n`, "utf8");

  await fs.writeFile(
    metadataPath,
    `${JSON.stringify(
      {
        source: SOURCE_URL,
        importedAt: importTimestamp,
        recordCount: scholarships.length,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`Imported ${scholarships.length} scholarships from UT Lasso.`);
  console.log(`Wrote ${path.relative(root, lassoPath)}`);
  console.log(`Wrote ${path.relative(root, defaultPath)}`);
  console.log(`Wrote ${path.relative(root, metadataPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
