#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { load } from "cheerio";

const SOURCES = {
  simplify: {
    name: "SimplifyJobs/Summer2026-Internships",
    readmeUrl: "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md",
    repoUrl: "https://github.com/SimplifyJobs/Summer2026-Internships",
  },
  vansh: {
    name: "vanshb03/Summer2026-Internships",
    readmeUrl: "https://raw.githubusercontent.com/vanshb03/Summer2026-Internships/main/README.md",
    repoUrl: "https://github.com/vanshb03/Summer2026-Internships",
  },
};

const ROLE_SKILLS = [
  [/(frontend|front-end|ui)/i, ["typescript", "react", "css", "accessibility"]],
  [/(backend|api|platform|distributed|infra|devops|sre)/i, ["python", "java", "sql", "git"]],
  [/(machine learning|ml|ai|data scientist|nlp|vision|genai)/i, ["python", "machine learning", "pytorch", "statistics"]],
  [/(security|cyber)/i, ["security", "python", "linux", "networking"]],
  [/(mobile|ios|android)/i, ["swift", "kotlin", "testing", "api integration"]],
  [/(embedded|firmware|hardware)/i, ["c++", "embedded systems", "debugging", "signal processing"]],
  [/(product manager|product management)/i, ["communication", "analytics", "experimentation", "sql"]],
];

const MAJOR_MAP = [
  [/(software|swe|developer|frontend|backend|platform|mobile|devops|security)/i, ["computer science", "software engineering", "electrical engineering"]],
  [/(machine learning|ai|data|analytics|quant|statistic)/i, ["computer science", "data science", "statistics", "mathematics"]],
  [/(hardware|embedded|firmware|electrical)/i, ["electrical engineering", "computer engineering", "computer science"]],
  [/(product manager|product|marketing)/i, ["business administration", "informatics", "economics"]],
];

const COURSEWORK_MAP = {
  "computer science": ["CS 312", "CS 314", "CS 329E"],
  "software engineering": ["CS 312", "CS 314", "CS 429"],
  "electrical engineering": ["EE 302", "EE 306", "EE 313"],
  "computer engineering": ["EE 306", "CS 314", "CS 429"],
  "data science": ["SDS 321", "CS 329E", "STA 309"],
  statistics: ["SDS 321", "STA 309", "M 341"],
  mathematics: ["M 408D", "M 340L", "M 341"],
  "business administration": ["MKT 337", "ECO 329", "STA 309"],
  informatics: ["CS 329E", "SDS 321", "PSY 301"],
  economics: ["ECO 329", "STA 309", "ACC 310F"],
};

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

function stripFlags(text) {
  return normalizeWhitespace(text.replace(/[🛂🇺🇸🔒🔥🎓↳]/g, "").replace(/\s{2,}/g, " "));
}

function inferTerm(text) {
  const lower = text.toLowerCase();
  if (lower.includes("spring")) return "spring";
  if (lower.includes("fall") || lower.includes("autumn")) return "fall";
  if (lower.includes("winter")) return "winter";
  if (lower.includes("co-op") || lower.includes("coop")) return "co-op";
  return "summer";
}

function toIsoDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function parseAgeToFreshness(ageValue, now) {
  const cleaned = ageValue.trim().toLowerCase();
  const day = cleaned.match(/(\d+)\s*d/);
  if (day) {
    const d = new Date(now.getTime() - Number(day[1]) * 24 * 60 * 60 * 1000);
    return d.toISOString();
  }

  const week = cleaned.match(/(\d+)\s*w/);
  if (week) {
    const d = new Date(now.getTime() - Number(week[1]) * 7 * 24 * 60 * 60 * 1000);
    return d.toISOString();
  }

  return now.toISOString();
}

function parseMonthDayToFreshness(monthDay, now) {
  const match = monthDay.match(/([A-Za-z]{3,9})\s+(\d{1,2})/);
  if (!match) {
    return now.toISOString();
  }

  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  const monthIndex = monthNames.findIndex((name) => name.startsWith(match[1].toLowerCase()));
  if (monthIndex < 0) {
    return now.toISOString();
  }

  const day = Number(match[2]);
  const nowMonth = now.getUTCMonth();
  const year = monthIndex > nowMonth + 1 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const parsed = new Date(Date.UTC(year, monthIndex, day));

  if (Number.isNaN(parsed.getTime())) {
    return now.toISOString();
  }

  return parsed.toISOString();
}

function inferSkills(role, title) {
  const haystack = `${role} ${title}`;
  const skills = new Set(["communication", "problem solving", "git"]);

  ROLE_SKILLS.forEach(([pattern, values]) => {
    if (pattern.test(haystack)) {
      values.forEach((value) => skills.add(value));
    }
  });

  return Array.from(skills).slice(0, 8);
}

function inferMajors(role, title) {
  const haystack = `${role} ${title}`;
  const majors = new Set();

  MAJOR_MAP.forEach(([pattern, values]) => {
    if (pattern.test(haystack)) {
      values.forEach((value) => majors.add(value));
    }
  });

  if (majors.size === 0) {
    ["computer science", "data science"].forEach((value) => majors.add(value));
  }

  return Array.from(majors).slice(0, 5);
}

function inferCoursework(majors, skills) {
  const courses = new Set();
  majors.forEach((major) => {
    (COURSEWORK_MAP[major] ?? []).forEach((course) => courses.add(course));
  });

  if (skills.includes("machine learning")) {
    ["CS 378", "SDS 321"].forEach((course) => courses.add(course));
  }
  if (skills.includes("react")) {
    ["CS 329E"].forEach((course) => courses.add(course));
  }

  return Array.from(courses).slice(0, 6);
}

function sanitizeLocation(raw) {
  return normalizeWhitespace(raw.replace(/<[^>]+>/g, " ").replace(/\|/g, ", ").replace(/\s*,\s*/g, ", "));
}

function parseSimplify(readme, now) {
  const $ = load(readme);
  const rows = [];
  let lastCompany = "";

  $("tr").each((_, row) => {
    const cols = $(row).find("td");
    if (cols.length < 5) {
      return;
    }

    const companyRaw = stripFlags(normalizeWhitespace($(cols[0]).text()));
    const roleRaw = stripFlags(normalizeWhitespace($(cols[1]).text()));
    const locationRaw = sanitizeLocation($(cols[2]).html() ?? $(cols[2]).text());
    const ageRaw = normalizeWhitespace($(cols[4]).text());

    const company = companyRaw === "↳" || companyRaw.length === 0 ? lastCompany : companyRaw;
    if (!company || !roleRaw) {
      return;
    }
    lastCompany = company;

    const links = $(cols[3]).find("a");
    let applyUrl = "";
    links.each((__, link) => {
      const href = $(link).attr("href") ?? "";
      if (!href || href.includes("i.imgur.com") || href.includes("simplify.jobs/p/")) {
        return;
      }
      if (!applyUrl) {
        applyUrl = href;
      }
    });

    if (!applyUrl) {
      return;
    }

    rows.push({
      company,
      title: roleRaw,
      location: locationRaw || "Unspecified",
      term: inferTerm(roleRaw),
      applyUrl,
      freshnessTimestamp: parseAgeToFreshness(ageRaw, now),
      sourceRepo: SOURCES.simplify.repoUrl,
    });
  });

  return rows;
}

function splitMarkdownRow(row) {
  const inner = row.trim().replace(/^\|/, "").replace(/\|$/, "");
  return inner.split("|").map((part) => part.trim());
}

function parseVansh(readme, now) {
  const lines = readme.split("\n");
  const rows = [];
  let inTable = false;
  let lastCompany = "";

  for (const line of lines) {
    if (line.startsWith("| Company | Role | Location | Application/Link | Date Posted |")) {
      inTable = true;
      continue;
    }

    if (!inTable) {
      continue;
    }

    if (!line.startsWith("|")) {
      break;
    }

    if (/^\|\s*-+/.test(line)) {
      continue;
    }

    const columns = splitMarkdownRow(line);
    if (columns.length < 5) {
      continue;
    }

    const companyRaw = stripFlags(normalizeWhitespace(columns[0]));
    const roleRaw = stripFlags(normalizeWhitespace(columns[1]));
    const locationRaw = sanitizeLocation(columns[2].replace(/<\/br>/gi, ", "));
    const appRaw = columns[3];
    const dateRaw = normalizeWhitespace(columns[4]);

    const company = companyRaw === "↳" || companyRaw.length === 0 ? lastCompany : companyRaw;
    if (!company || !roleRaw) {
      continue;
    }
    lastCompany = company;

    const hrefMatch = appRaw.match(/href="([^"]+)"/i);
    if (!hrefMatch) {
      continue;
    }

    rows.push({
      company,
      title: roleRaw,
      location: locationRaw || "Unspecified",
      term: inferTerm(roleRaw),
      applyUrl: hrefMatch[1],
      freshnessTimestamp: parseMonthDayToFreshness(dateRaw, now),
      sourceRepo: SOURCES.vansh.repoUrl,
    });
  }

  return rows;
}

function buildInternshipRecords(items, importedAt, now) {
  const deduped = new Map();

  items.forEach((item) => {
    const key = `${item.company.toLowerCase()}|${item.title.toLowerCase()}|${item.location.toLowerCase()}|${item.applyUrl.toLowerCase()}`;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, item);
      return;
    }

    if (item.freshnessTimestamp > existing.freshnessTimestamp) {
      deduped.set(key, item);
    }
  });

  const rows = Array.from(deduped.values())
    .map((item) => {
      const skills = inferSkills(item.title, item.company);
      const majors = inferMajors(item.title, item.company);
      const coursework = inferCoursework(majors, skills);

      const datePosted = toIsoDate(item.freshnessTimestamp) ?? now.toISOString().slice(0, 10);
      const applyBy = new Date(`${datePosted}T00:00:00Z`);
      applyBy.setUTCDate(applyBy.getUTCDate() + 60);

      return {
        id: `int-${slugify(`${item.company}-${item.title}-${item.location}`)}`,
        kind: "internship",
        title: item.title,
        organization: item.company,
        location: item.location,
        pay: "Compensation varies",
        term: item.term,
        datePosted,
        applyBy: applyBy.toISOString().slice(0, 10),
        skills,
        preferredMajors: majors,
        preferredCoursework: coursework,
        description: `${item.company} internship listing imported from community-maintained Summer 2026 internship repositories.`,
        details: `Open the direct application link for latest posting details. Aggregated from ${item.sourceRepo}.`,
        applyUrl: item.applyUrl,
        freshnessTimestamp: item.freshnessTimestamp,
        sourceUrl: item.sourceRepo,
        importTimestamp: importedAt,
      };
    })
    .sort((a, b) => {
      if (b.freshnessTimestamp !== a.freshnessTimestamp) {
        return b.freshnessTimestamp.localeCompare(a.freshnessTimestamp);
      }
      return a.title.localeCompare(b.title);
    });

  const seenIds = new Map();
  return rows.map((row) => {
    const count = (seenIds.get(row.id) ?? 0) + 1;
    seenIds.set(row.id, count);
    if (count === 1) {
      return row;
    }
    return { ...row, id: `${row.id}-${count}` };
  });
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "hook-internship-importer/1.0",
      Accept: "text/plain, text/markdown, text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

async function main() {
  const importedAt = new Date().toISOString();
  const now = new Date();

  const [simplifyReadme, vanshReadme] = await Promise.all([
    fetchText(SOURCES.simplify.readmeUrl),
    fetchText(SOURCES.vansh.readmeUrl),
  ]);

  const parsedSimplify = parseSimplify(simplifyReadme, now);
  const parsedVansh = parseVansh(vanshReadme, now);

  const internships = buildInternshipRecords(
    [...parsedSimplify, ...parsedVansh],
    importedAt,
    now,
  );

  const root = process.cwd();
  const dir = path.join(root, "data", "opportunities");
  await fs.mkdir(dir, { recursive: true });

  const primaryPath = path.join(dir, "internships.json");
  const catalogPath = path.join(dir, "internships-imported.json");
  const metadataPath = path.join(dir, "internship-import-metadata.json");

  await fs.writeFile(primaryPath, `${JSON.stringify(internships, null, 2)}\n`, "utf8");
  await fs.writeFile(catalogPath, `${JSON.stringify(internships, null, 2)}\n`, "utf8");
  await fs.writeFile(
    metadataPath,
    `${JSON.stringify(
      {
        importedAt,
        recordCount: internships.length,
        sourceBreakdown: {
          simplify: parsedSimplify.length,
          vansh: parsedVansh.length,
        },
        sources: [SOURCES.simplify.repoUrl, SOURCES.vansh.repoUrl],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`Imported internships: ${internships.length}`);
  console.log(`Wrote ${path.relative(root, primaryPath)}`);
  console.log(`Wrote ${path.relative(root, catalogPath)}`);
  console.log(`Wrote ${path.relative(root, metadataPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
