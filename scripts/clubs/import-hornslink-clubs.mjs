#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { load } from "cheerio";

const HORNSLINK_BASE = "https://utexas.campuslabs.com";
const SEARCH_ENDPOINT = `${HORNSLINK_BASE}/engage/api/discovery/search/organizations`;
const PAGE_SIZE = 100;

const TAG_SEEDS = [
  "ai",
  "machine learning",
  "data",
  "robotics",
  "entrepreneurship",
  "finance",
  "consulting",
  "community",
  "service",
  "health",
  "mental health",
  "policy",
  "advocacy",
  "music",
  "dance",
  "theater",
  "culture",
  "international",
  "leadership",
  "mentorship",
  "research",
  "technology",
  "engineering",
  "design",
  "sports",
  "recreation",
  "faith",
  "education",
  "gaming",
  "law",
  "pre-med",
  "pre-law",
  "sustainability",
  "environment",
  "media",
  "journalism",
  "marketing",
  "product",
];

const CATEGORY_TO_TAGS = {
  "Academic": ["education", "research", "mentorship"],
  "Arts/Entertainment": ["music", "dance", "theater", "arts"],
  "Cultural/International": ["culture", "international", "community"],
  "Honorary": ["leadership", "mentorship", "academic"],
  "Special Interest": ["community", "special interest", "networking"],
  "Religious/Spiritual": ["faith", "community", "service"],
  "Service/Philanthropy": ["service", "community", "advocacy"],
  "Sport Clubs": ["sports", "recreation", "wellness"],
  "Student Governance": ["leadership", "policy", "advocacy"],
  "Sororities and Fraternities": ["community", "leadership", "service"],
  "Recreational": ["recreation", "wellness", "community"],
  "Social": ["community", "social", "networking"],
  "Graduate Student Oriented": ["graduate", "research", "professional"],
  "Departmental": ["academic", "professional", "career"],
  "Media": ["media", "journalism", "communications"],
  "Professional": ["career", "networking", "leadership"],
};

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function stripHtml(value) {
  const $ = load(`<div>${value ?? ""}</div>`);
  return normalizeWhitespace($("div").text());
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

function buildJoinLink(websiteKey, id) {
  if (websiteKey && websiteKey.trim().length > 0) {
    return `${HORNSLINK_BASE}/engage/organization/${websiteKey.trim()}`;
  }
  return `${HORNSLINK_BASE}/engage/organization/${id}`;
}

function inferInterestTags(name, categoryNames, description) {
  const lower = `${name} ${description}`.toLowerCase();
  const tags = new Set();

  categoryNames.forEach((category) => {
    const mapped = CATEGORY_TO_TAGS[category];
    if (mapped) {
      mapped.forEach((tag) => tags.add(tag));
    }
    const normalizedCategory = category.toLowerCase();
    if (normalizedCategory.includes("cultural")) tags.add("culture");
    if (normalizedCategory.includes("service")) tags.add("service");
    if (normalizedCategory.includes("professional")) tags.add("career");
  });

  TAG_SEEDS.forEach((seed) => {
    if (lower.includes(seed)) {
      tags.add(seed);
    }
  });

  return Array.from(tags).slice(0, 8);
}

function inferMajors(name, description, tags) {
  const lower = `${name} ${description} ${tags.join(" ")}`.toLowerCase();
  const majors = new Set();

  if (/(engineer|computer|software|ai|robotics|coding|hack)/.test(lower)) {
    majors.add("Computer Science");
    majors.add("Electrical and Computer Engineering");
  }
  if (/(business|finance|consult|marketing|entrepreneur)/.test(lower)) {
    majors.add("Business Administration");
  }
  if (/(bio|health|medical|pre-med|mental health|neuro)/.test(lower)) {
    majors.add("Biology");
  }
  if (/(math|stat|data|analytics)/.test(lower)) {
    majors.add("Mathematics");
  }
  if (/(psych|therapy|counseling|mental)/.test(lower)) {
    majors.add("Psychology");
  }

  return Array.from(majors).slice(0, 4);
}

function inferCareers(description, tags) {
  const lower = `${description} ${tags.join(" ")}`.toLowerCase();
  const careers = new Set();

  if (/(research|lab|academic|graduate|grad school)/.test(lower)) {
    careers.add("research");
    careers.add("grad_school");
  }
  if (/(career|professional|industry|networking|internship)/.test(lower)) {
    careers.add("industry");
  }
  if (/(community|social|service|explore|interest)/.test(lower)) {
    careers.add("undecided");
  }

  if (careers.size === 0) {
    careers.add("undecided");
  }

  return Array.from(careers).slice(0, 3);
}

function inferTimeCommitment(categoryNames, description) {
  const lower = description.toLowerCase();

  if (/(weekly|every week|practice|rehearsal|competition)/.test(lower)) {
    return "4-6 hrs/week";
  }
  if (/(monthly|once a month|biweekly)/.test(lower)) {
    return "2-3 hrs/week";
  }

  if (categoryNames.includes("Sport Clubs")) {
    return "5-8 hrs/week";
  }
  if (categoryNames.includes("Student Governance")) {
    return "3-5 hrs/week";
  }
  if (categoryNames.includes("Service/Philanthropy")) {
    return "2-4 hrs/week";
  }

  return "2-4 hrs/week";
}

function inferMeetingCadence(categoryNames, description) {
  const lower = description.toLowerCase();

  if (/(weekly|every week)/.test(lower)) {
    return "Weekly";
  }
  if (/(biweekly|every other week)/.test(lower)) {
    return "Biweekly";
  }
  if (/(monthly|once a month)/.test(lower)) {
    return "Monthly";
  }

  if (categoryNames.includes("Sport Clubs")) {
    return "Weekly practices";
  }
  if (categoryNames.includes("Service/Philanthropy")) {
    return "Weekly or event-based";
  }

  return "Weekly or biweekly";
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "hook-hornslink-importer/1.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.json();
}

function buildSearchUrl(skip, top) {
  const params = new URLSearchParams({
    "orderBy[0]": "UpperName asc",
    top: String(top),
    filter: "",
    query: "",
    skip: String(skip),
  });
  return `${SEARCH_ENDPOINT}?${params.toString()}`;
}

async function loadAllOrganizations() {
  const firstPage = await fetchJson(buildSearchUrl(0, PAGE_SIZE));
  const total = Number(firstPage["@odata.count"] ?? 0);
  const all = [...(firstPage.value ?? [])];

  for (let skip = PAGE_SIZE; skip < total; skip += PAGE_SIZE) {
    const page = await fetchJson(buildSearchUrl(skip, PAGE_SIZE));
    all.push(...(page.value ?? []));
  }

  return { total, organizations: all };
}

function normalizeClub(org, importTimestamp) {
  const name = normalizeWhitespace(org.Name ?? "");
  if (!name) {
    return null;
  }

  const categoryNames = Array.isArray(org.CategoryNames) && org.CategoryNames.length > 0
    ? org.CategoryNames.map((value) => normalizeWhitespace(String(value))).filter(Boolean)
    : ["General"];

  const summary = normalizeWhitespace(org.Summary ?? "");
  const descriptionBody = normalizeWhitespace(stripHtml(org.Description ?? ""));
  const description = summary || descriptionBody || "UT Austin student organization listed on Hornslink.";

  const tags = inferInterestTags(name, categoryNames, description);
  const majors = inferMajors(name, description, tags);
  const careers = inferCareers(description, tags);

  return {
    id: `hornslink-${slugify(org.WebsiteKey || name || String(org.Id))}`,
    name,
    category: categoryNames[0],
    description,
    interestTags: tags,
    majors,
    careers,
    timeCommitment: inferTimeCommitment(categoryNames, description),
    meetingCadence: inferMeetingCadence(categoryNames, description),
    joinLink: buildJoinLink(org.WebsiteKey, org.Id),
    sourceUrl: buildJoinLink(org.WebsiteKey, org.Id),
    importTimestamp,
  };
}

async function main() {
  const importTimestamp = new Date().toISOString();
  const { organizations } = await loadAllOrganizations();

  const clubs = organizations
    .map((org) => normalizeClub(org, importTimestamp))
    .filter(Boolean)
    .filter((club) => club)
    .sort((a, b) => a.name.localeCompare(b.name));

  const root = process.cwd();
  const clubsDir = path.join(root, "data", "clubs");
  const hornslinkPath = path.join(clubsDir, "hornslink-clubs.json");
  const defaultPath = path.join(clubsDir, "clubs.json");
  const metadataPath = path.join(clubsDir, "hornslink-import-metadata.json");

  await fs.mkdir(clubsDir, { recursive: true });
  await fs.writeFile(hornslinkPath, `${JSON.stringify(clubs, null, 2)}\n`, "utf8");
  await fs.writeFile(defaultPath, `${JSON.stringify(clubs, null, 2)}\n`, "utf8");
  await fs.writeFile(
    metadataPath,
    `${JSON.stringify(
      {
        source: `${HORNSLINK_BASE}/engage/organizations`,
        importedAt: importTimestamp,
        recordCount: clubs.length,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`Imported ${clubs.length} Hornslink organizations.`);
  console.log(`Wrote ${path.relative(root, hornslinkPath)}`);
  console.log(`Wrote ${path.relative(root, defaultPath)}`);
  console.log(`Wrote ${path.relative(root, metadataPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
