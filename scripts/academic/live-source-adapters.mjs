import * as cheerio from "cheerio";
import { PDFParse } from "pdf-parse";

const UNDERGRAD_MAJORS_URL = "https://admissions.utexas.edu/explore/colleges-degrees/";
const CS_PLAN_PDF_URL =
  "https://cns.utexas.edu/sites/default/files/uploads/degree-plans/ut-bs-computer-science-option1-4-yr-plan-22-24-catalog.pdf";
const BIOLOGY_PLAN_PDF_URL =
  "https://cns.utexas.edu/sites/default/files/uploads/degree-plans/ut-bs-biology-option1-4-yr-plan-24-26-catalog.pdf";
const ECE_PLAN_URL =
  "https://catalog.utexas.edu/undergraduate/engineering/degrees-and-programs/bs-electrical-engineering/suggested-arrangement-of-courses-electrical-engineering/";
const BUSINESS_PLAN_PDF_URL =
  "https://live-mymccombs.pantheonsite.io/wp-content/uploads/2025/09/UND-Advising-Sheet-24-26.pdf.pdf";
const COURSE_SEARCH_URL = "https://catalog.utexas.edu/search/?P=";

const MAJOR_CATALOG_ID = "ut-undergrad-majors";
const DEGREE_PLAN_CATALOG_ID = "ut-undergrad-degree-plans";
const SCHEDULE_CATALOG_ID = "ut-undergrad-course-schedule";

const DEFAULT_PROFESSOR_NAME = "See UT syllabus database";
const DEFAULT_PROFESSOR_DIFFICULTY = "Official catalog import only";
const DEFAULT_GRADE_TENDENCY = "Not imported from official source";
const DEFAULT_ATTENDANCE_POLICY = "Check the published syllabus";

const SUPPORTED_MAJOR_PLAN_IDS = new Map([
  ["accounting", "mccombs-undergraduate-business-bba"],
  ["business analytics", "mccombs-undergraduate-business-bba"],
  ["computer science", "computer-science-bs"],
  ["electrical and computer engineering", "electrical-and-computer-engineering-bs"],
  ["finance", "mccombs-undergraduate-business-bba"],
  ["international business", "mccombs-undergraduate-business-bba"],
  ["management", "mccombs-undergraduate-business-bba"],
  ["management information systems", "mccombs-undergraduate-business-bba"],
  ["marketing", "mccombs-undergraduate-business-bba"],
  ["supply chain management", "mccombs-undergraduate-business-bba"],
  ["biology", "biology-bs"],
]);

const BUSINESS_ALIASES = [
  "Business Administration",
  "Accounting",
  "Business Analytics",
  "Finance",
  "International Business",
  "Management",
  "Management Information Systems",
  "Marketing",
  "Supply Chain Management",
];

const RAW_COURSE_ID_REGEX = /\b([A-Z](?:\s[A-Z]){0,2}|[A-Z]{2,4})\s\d{3}[A-Z]?\b/g;
const COURSE_DETAIL_CONCURRENCY = 4;

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniq(values) {
  return Array.from(new Set(values));
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "-");
}

function cleanText(value) {
  return decodeHtmlEntities(
    value
      .replace(/<sup[\s\S]*?<\/sup>/g, "")
      .replace(/<br\s*\/?>/g, " ")
      .replace(/<a [^>]*>([\s\S]*?)<\/a>/g, "$1")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function normalizeLine(line) {
  return decodeHtmlEntities(line).replace(/\s+/g, " ").trim();
}

function normalizeCourseId(courseId) {
  const normalized = normalizeLine(courseId);
  const match = normalized.match(/^([A-Z](?:\s[A-Z]){0,2}|[A-Z]{2,4})\s(\d{3}[A-Z]?)$/);

  if (!match) {
    return normalized;
  }

  const department = match[1].replace(/\s+/g, "");
  return `${department} ${match[2]}`;
}

function isIntroOrMetaParagraph(text) {
  return (
    text.includes("offers freshman") ||
    text.includes("offers transfer") ||
    text.includes("applicants apply") ||
    text.includes("students select") ||
    text.includes("Only freshmen") ||
    text.includes("Apply to") ||
    text.includes("admission") ||
    text.includes("undergraduate pre-pharmacy prerequisites")
  );
}

function shouldSkipListItem(text) {
  return (
    !text ||
    text === "Contact" ||
    text.includes("Undeclared") ||
    /Dual degree plan/i.test(text) ||
    /Integrated Master/i.test(text) ||
    /Integrated undergraduate\/graduate program/i.test(text) ||
    /^Applying for Honors$/i.test(text) ||
    /^The /i.test(text)
  );
}

function isPotentialMajorHeading(text) {
  if (!text || text.length > 90 || text === "Contact") {
    return false;
  }

  if (shouldSkipListItem(text) || /Integrated Master/i.test(text)) {
    return false;
  }

  if (isIntroOrMetaParagraph(text)) {
    return false;
  }

  if (/Additional|Honors|Special Program|Special Programs|Applying for Honors/i.test(text)) {
    return false;
  }

  return !text.includes(".");
}

function parseHeading(text) {
  const match = text.match(/^(B\.?S\.?\s+in\s+[^:]+):\s*(.+)$/i);

  if (match) {
    return {
      degreeLabel: match[1],
      displayName: match[2],
    };
  }

  return {
    displayName: text,
  };
}

function extractCollegeSections(html) {
  const regex =
    /<div id="[^"]+" class="college[\s\S]*?<div class="title"><h2>(?:<a[^>]*>)?([\s\S]*?)(?:<\/a>)?<\/h2><\/div>[\s\S]*?<section class="contentEditor[\s\S]*?>([\s\S]*?)<\/section>/g;
  const sections = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    sections.push({
      college: cleanText(match[1]),
      contentHtml: match[2],
    });
  }

  return sections;
}

function parseMajorsForCollege(college, contentHtml) {
  const nestedMajors = [];
  const nestedListRegex = /<li>\s*([^<]+?)\s*<ul[^>]*>([\s\S]*?)<\/ul>\s*<\/li>/g;
  let nestedMatch;

  while ((nestedMatch = nestedListRegex.exec(contentHtml)) !== null) {
    const heading = parseHeading(cleanText(nestedMatch[1]));
    const specializations = [];
    const childRegex = /<li>([\s\S]*?)<\/li>/g;
    let childMatch;

    while ((childMatch = childRegex.exec(nestedMatch[2])) !== null) {
      const childText = cleanText(childMatch[1]);

      if (!shouldSkipListItem(childText)) {
        specializations.push(childText);
      }
    }

    nestedMajors.push({
      heading,
      specializations,
    });
  }

  const flattenedContentHtml = contentHtml.replace(nestedListRegex, "");
  const tokens = [];
  const tokenRegex = /<(p|li)[^>]*>([\s\S]*?)<\/\1>/g;
  let match;

  while ((match = tokenRegex.exec(flattenedContentHtml)) !== null) {
    const text = cleanText(match[2]);

    if (text) {
      tokens.push({
        type: match[1],
        text,
      });
    }
  }

  const majors = [];
  const seen = new Set();

  for (const nestedMajor of nestedMajors) {
    if (shouldSkipListItem(nestedMajor.heading.displayName)) {
      continue;
    }

    const id = slugify(`${college}-${nestedMajor.heading.displayName}`);
    const planId = SUPPORTED_MAJOR_PLAN_IDS.get(nestedMajor.heading.displayName.toLowerCase());

    if (!seen.has(id)) {
      majors.push({
        majorId: id,
        displayName: nestedMajor.heading.displayName,
        college,
        level: "undergraduate",
        supportStatus: planId ? "supported" : "planned",
        normalizedPlanId: planId,
        degreeLabel: nestedMajor.heading.degreeLabel,
        specializations: nestedMajor.specializations.length > 0 ? nestedMajor.specializations : undefined,
      });
      seen.add(id);
    }
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.type !== "p" || !isPotentialMajorHeading(token.text)) {
      continue;
    }

    const nextToken = tokens[index + 1];
    const heading = parseHeading(token.text);

    if (nextToken?.type === "li") {
      const specializations = [];
      let pointer = index + 1;

      while (tokens[pointer]?.type === "li") {
        if (!shouldSkipListItem(tokens[pointer].text)) {
          specializations.push(tokens[pointer].text);
        }

        pointer += 1;
      }

      const id = slugify(`${college}-${heading.displayName}`);

      if (!seen.has(id)) {
        const planId = SUPPORTED_MAJOR_PLAN_IDS.get(heading.displayName.toLowerCase());
        majors.push({
          majorId: id,
          displayName: heading.displayName,
          college,
          level: "undergraduate",
          supportStatus: planId ? "supported" : "planned",
          normalizedPlanId: planId,
          degreeLabel: heading.degreeLabel,
          specializations: specializations.length > 0 ? specializations : undefined,
        });
        seen.add(id);
      }

      index = pointer - 1;
      continue;
    }

    const id = slugify(`${college}-${heading.displayName}`);

    if (!seen.has(id)) {
      const planId = SUPPORTED_MAJOR_PLAN_IDS.get(heading.displayName.toLowerCase());
      majors.push({
        majorId: id,
        displayName: heading.displayName,
        college,
        level: "undergraduate",
        supportStatus: planId ? "supported" : "planned",
        normalizedPlanId: planId,
        degreeLabel: heading.degreeLabel,
      });
      seen.add(id);
    }
  }

  return majors;
}

async function fetchHtml(url, attempt = 1) {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "HookAcademicSync/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    if (attempt >= 4) {
      throw error;
    }

    await sleep(500 * attempt);
    return fetchHtml(url, attempt + 1);
  }
}

async function fetchPdfText(url) {
  const parser = new PDFParse({ url });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}

function buildSourceMetadata(sourceName, sourceUrl, notes = []) {
  return {
    sourceName,
    sourceUrl,
    importedAt: new Date().toISOString(),
    notes,
  };
}

function extractCourseIds(line) {
  const matches = line.match(RAW_COURSE_ID_REGEX) ?? [];
  return uniq(matches.map(normalizeCourseId));
}

function buildCourseQueryVariants(courseId) {
  const normalizedCourseId = normalizeCourseId(courseId);
  const match = normalizedCourseId.match(/^([A-Z]{1,4})\s(\d{3}[A-Z]?)$/);

  if (!match) {
    return [normalizedCourseId];
  }

  const [, department, number] = match;
  const variants = [normalizedCourseId];

  if (department.length === 2) {
    variants.push(`${department.split("").join(" ")} ${number}`);
  }

  return uniq(variants);
}

function parseCourseCreditCount(headingText) {
  const match = normalizeLine(headingText).match(/(\d+)\s+Hours?\./i);
  return match ? Number(match[1]) : 3;
}

function parseCourseHeading(headingText, courseId) {
  const normalizedHeading = normalizeLine(headingText).replace(/\u00a0/g, " ");
  const courseCodePattern = String.raw`(?:[A-Z](?:\s[A-Z]){0,3}|[A-Z]{1,4})\s\d{3}[A-Z]?`;
  const titleRegex = new RegExp(
    `^${courseCodePattern}(?:\\s+${courseCodePattern})?\\.\\s+(.+?)\\.\\s+\\d+\\s+Hours?\\.$`,
    "i",
  );
  const titleMatch = normalizedHeading.match(titleRegex);
  return titleMatch ? titleMatch[1].trim() : courseId;
}

function parsePrerequisites(descriptionText) {
  const prerequisiteMatch = descriptionText.match(/Prerequisite:\s*(.+?)(?:\.|$)/i);
  return prerequisiteMatch ? extractCourseIds(prerequisiteMatch[1]) : [];
}

function extractCourseIdFromHeadingText(headingText) {
  const match = normalizeLine(headingText).replace(/\u00a0/g, " ").match(RAW_COURSE_ID_REGEX);
  return match && match.length > 0 ? normalizeCourseId(match[0]) : null;
}

function mergeBucketType(currentType, nextType) {
  if (currentType === "major" || nextType === "major") {
    return "major";
  }

  if (currentType === "core" || nextType === "core") {
    return "core";
  }

  return "elective";
}

function normalizeBucketType(label) {
  if (label === "major") {
    return "major";
  }

  if (label === "elective") {
    return "elective";
  }

  return "core";
}

function getUpcomingRegularTerms() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  if (month <= 5) {
    return [`Fall ${year}`, `Spring ${year + 1}`];
  }

  if (month <= 11) {
    return [`Spring ${year + 1}`, `Fall ${year + 1}`];
  }

  return [`Spring ${year + 1}`, `Fall ${year + 1}`];
}

function buildScheduleCatalog(plans) {
  const [termA, termB] = getUpcomingRegularTerms();
  const fallLabel = termA.startsWith("Fall") ? termA : termB;
  const springLabel = termA.startsWith("Spring") ? termA : termB;
  const termSnapshots = [];

  for (const plan of plans) {
    termSnapshots.push({
      courseCatalogId: plan.courseCatalogId,
      term: fallLabel,
      isRegularTerm: true,
      offeredCourseIds: uniq(
        plan.entries.filter((entry) => entry.termsOffered.includes("Fall")).map((entry) => entry.courseId),
      ),
    });
    termSnapshots.push({
      courseCatalogId: plan.courseCatalogId,
      term: springLabel,
      isRegularTerm: true,
      offeredCourseIds: uniq(
        plan.entries.filter((entry) => entry.termsOffered.includes("Spring")).map((entry) => entry.courseId),
      ),
    });
  }

  return {
    catalogId: SCHEDULE_CATALOG_ID,
    level: "undergraduate",
    sourceMetadata: buildSourceMetadata(
      "UT Austin official planning documents",
      "https://catalog.utexas.edu/",
      [
        "Published regular-term offerings are derived from official UT suggested plans and checklists.",
        "Repo academic schedule snapshots are no longer used.",
      ],
    ),
    termSnapshots,
  };
}

function deriveHonorsEquivalencies(catalogs) {
  const equivalencies = {};

  for (const catalog of catalogs) {
    equivalencies[catalog.catalogId] = {};
    const courseIds = new Set(catalog.courses.map((course) => course.courseId));

    for (const courseId of courseIds) {
      if (!courseId.endsWith("H")) {
        continue;
      }

      const nonHonorsCourseId = courseId.slice(0, -1);

      if (courseIds.has(nonHonorsCourseId)) {
        equivalencies[catalog.catalogId][courseId] = [nonHonorsCourseId];
      }
    }
  }

  return equivalencies;
}

function dedupePlanEntries(entries) {
  const byCourseId = new Map();

  for (const entry of entries) {
    const existing = byCourseId.get(entry.courseId);

    if (!existing) {
      byCourseId.set(entry.courseId, {
        ...entry,
        termsOffered: [...entry.termsOffered],
      });
      continue;
    }

    existing.bucketType = mergeBucketType(existing.bucketType, entry.bucketType);
    existing.termsOffered = uniq([...existing.termsOffered, ...entry.termsOffered]).sort();
    existing.sourceNotes = uniq([...existing.sourceNotes, ...entry.sourceNotes]);
  }

  return Array.from(byCourseId.values());
}

function parsePdfPlanEntries(text, bucketTypeResolver) {
  const lines = text
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);
  const entries = [];
  let activeTerm = null;

  for (const line of lines) {
    if (/^Fall:?$/i.test(line)) {
      activeTerm = "Fall";
      continue;
    }

    if (/^Spring:?$/i.test(line)) {
      activeTerm = "Spring";
      continue;
    }

    if (!activeTerm || !/^(Core|Major|Core\/Major|Elective):/i.test(line)) {
      continue;
    }

    const courseIds = extractCourseIds(line);

    if (courseIds.length === 0) {
      continue;
    }

    entries.push({
      courseId: courseIds[0],
      bucketType: normalizeBucketType(bucketTypeResolver(line)),
      termsOffered: [activeTerm],
      sourceNotes: [line],
    });
  }

  return dedupePlanEntries(entries);
}

function parseEcePlanEntries(html) {
  const $ = cheerio.load(html);
  const rows = $("table tr").toArray();
  const entries = [];
  let activeTerm = null;

  for (const row of rows) {
    const rowText = normalizeLine($(row).text());

    if (/^(1st|3rd|5th|7th) Semester$/i.test(rowText)) {
      activeTerm = "Fall";
      continue;
    }

    if (/^(2nd|4th|6th|8th) Semester$/i.test(rowText)) {
      activeTerm = "Spring";
      continue;
    }

    if (!activeTerm) {
      continue;
    }

    const courseIds = extractCourseIds(rowText);

    if (courseIds.length === 0) {
      continue;
    }

    entries.push({
      courseId: courseIds[0],
      bucketType: rowText.includes("(Major)") ? "major" : "core",
      termsOffered: [activeTerm],
      sourceNotes: [rowText],
    });
  }

  return dedupePlanEntries(entries);
}

function parseBusinessPlanEntries(text) {
  const lines = text
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);
  const entries = [];
  let currentBucketType = "core";

  for (const line of lines) {
    if (/Lower-Division Business Core/i.test(line) || /Additional Requirements/i.test(line)) {
      currentBucketType = "major";
      continue;
    }

    if (/University Core Curriculum/i.test(line) || /Human Behavior Requirement/i.test(line)) {
      currentBucketType = "core";
      continue;
    }

    const courseIds = extractCourseIds(line).filter(
      (courseId) => !["BA 101", "MAN 101"].includes(courseId),
    );

    if (courseIds.length === 0) {
      continue;
    }

    entries.push({
      courseId: courseIds[0],
      bucketType: currentBucketType,
      termsOffered: ["Fall", "Spring"],
      sourceNotes: [line],
    });
  }

  return dedupePlanEntries(entries);
}

async function loadCourseDetails(courseId) {
  let html = null;
  let url = null;
  let resultHtmlFound = false;

  for (const queryVariant of buildCourseQueryVariants(courseId)) {
    const candidateUrl = `${COURSE_SEARCH_URL}${encodeURIComponent(queryVariant)}`;
    const candidateHtml = await fetchHtml(candidateUrl);
    const $candidate = cheerio.load(candidateHtml);

    const matchingResult = $candidate(".searchresult").filter((_, element) => {
      const block = $candidate(element);
      const headingText = normalizeLine(block.find("h2").first().text()).replace(/\u00a0/g, " ");
      return (
        block.find(".courseblock").length > 0 &&
        extractCourseIdFromHeadingText(headingText) === courseId
      );
    });

    if (matchingResult.first().length > 0) {
      html = candidateHtml;
      url = candidateUrl;
      resultHtmlFound = true;
      break;
    }
  }

  if (!resultHtmlFound || !html || !url) {
    throw new Error(`Missing official course metadata for ${courseId}`);
  }

  const $ = cheerio.load(html);
  const result = $(".searchresult").filter((_, element) => {
    const block = $(element);
    const headingText = normalizeLine(block.find("h2").first().text()).replace(/\u00a0/g, " ");
    return (
      block.find(".courseblock").length > 0 &&
      extractCourseIdFromHeadingText(headingText) === courseId
    );
  }).first();

  const headingText = result.find("h2").first().text();
  const descriptionText = normalizeLine(result.find(".courseblockdesc").first().text());

  return {
    courseId,
    courseName: parseCourseHeading(headingText, courseId),
    credits: parseCourseCreditCount(headingText),
    prerequisites: parsePrerequisites(descriptionText),
    sourceUrl: url,
  };
}

function buildCourseCatalog(plan, courseDetailsById) {
  return {
    catalogId: plan.courseCatalogId,
    degreeId: plan.degreeId,
    sourceMetadata: buildSourceMetadata("UT Austin official catalog search", "https://catalog.utexas.edu/course-search"),
    courses: plan.entries.map((entry) => {
      const details = courseDetailsById.get(entry.courseId);

      if (!details) {
        throw new Error(`Missing loaded course details for ${entry.courseId}`);
      }

      return {
        courseId: entry.courseId,
        courseName: details.courseName,
        requirementBucket: normalizeBucketType(entry.bucketType),
        credits: details.credits,
        prerequisites: details.prerequisites,
        termsOffered: entry.termsOffered,
        professorName: DEFAULT_PROFESSOR_NAME,
        professorDifficulty: DEFAULT_PROFESSOR_DIFFICULTY,
        gradeTendency: DEFAULT_GRADE_TENDENCY,
        attendancePolicy: DEFAULT_ATTENDANCE_POLICY,
      };
    }),
  };
}

function buildDegreePlan(plan, courseDetailsById) {
  return {
    planId: plan.planId,
    degreeId: plan.degreeId,
    majorId: plan.majorId,
    majorName: plan.majorName,
    aliases: plan.aliases,
    degreeName: plan.degreeName,
    college: plan.college,
    level: "undergraduate",
    totalCredits: plan.totalCredits,
    courseCatalogId: plan.courseCatalogId,
    supportStatus: "supported",
    sourceMetadata: plan.sourceMetadata,
    requirementBuckets: plan.entries.map((entry) => {
      const details = courseDetailsById.get(entry.courseId);

      if (!details) {
        throw new Error(`Missing degree-plan course details for ${entry.courseId}`);
      }

      return {
        id: `${plan.planId}-${slugify(entry.courseId)}`,
        title: details.courseName,
        bucketType: normalizeBucketType(entry.bucketType),
        creditsRequired: details.credits,
        courses: [entry.courseId],
        notes: entry.sourceNotes.join(" | "),
      };
    }),
  };
}

async function loadUndergradMajorsCatalog() {
  const html = await fetchHtml(UNDERGRAD_MAJORS_URL);
  const sections = extractCollegeSections(html);
  const majors = sections.flatMap((section) => parseMajorsForCollege(section.college, section.contentHtml));

  return {
    catalogId: MAJOR_CATALOG_ID,
    level: "undergraduate",
    sourceMetadata: buildSourceMetadata("UT Austin undergraduate majors", UNDERGRAD_MAJORS_URL),
    majors,
  };
}

async function loadComputerSciencePlan() {
  const text = await fetchPdfText(CS_PLAN_PDF_URL);
  return {
    planId: "computer-science-bs",
    degreeId: "computer-science-bs",
    majorId: "computer-science",
    majorName: "Computer Science",
    aliases: [],
    degreeName: "Bachelor of Science in Computer Science",
    college: "College of Natural Sciences",
    totalCredits: 120,
    courseCatalogId: "cs-catalog",
    sourceMetadata: buildSourceMetadata("UT Austin official computer science degree plan", CS_PLAN_PDF_URL),
    entries: parsePdfPlanEntries(text, (line) => (line.includes("Major:") ? "major" : "core")),
  };
}

async function loadElectricalEngineeringPlan() {
  const html = await fetchHtml(ECE_PLAN_URL);
  return {
    planId: "electrical-and-computer-engineering-bs",
    degreeId: "electrical-and-computer-engineering-bs",
    majorId: "electrical-and-computer-engineering",
    majorName: "Electrical and Computer Engineering",
    aliases: [],
    degreeName: "Bachelor of Science in Electrical and Computer Engineering",
    college: "Cockrell School of Engineering",
    totalCredits: 125,
    courseCatalogId: "ece-catalog",
    sourceMetadata: buildSourceMetadata("UT Austin official ECE suggested arrangement", ECE_PLAN_URL),
    entries: parseEcePlanEntries(html),
  };
}

async function loadBiologyPlan() {
  const text = await fetchPdfText(BIOLOGY_PLAN_PDF_URL);
  return {
    planId: "biology-bs",
    degreeId: "biology-bs",
    majorId: "biology",
    majorName: "Biology",
    aliases: [],
    degreeName: "Bachelor of Science in Biology",
    college: "College of Natural Sciences",
    totalCredits: 120,
    courseCatalogId: "biology-catalog",
    sourceMetadata: buildSourceMetadata("UT Austin official biology degree plan", BIOLOGY_PLAN_PDF_URL),
    entries: parsePdfPlanEntries(text, (line) => (line.includes("Major:") ? "major" : "core")),
  };
}

async function loadBusinessPlan() {
  const text = await fetchPdfText(BUSINESS_PLAN_PDF_URL);
  return {
    planId: "mccombs-undergraduate-business-bba",
    degreeId: "mccombs-undergraduate-business-bba",
    majorId: "business-administration",
    majorName: "Business Administration",
    aliases: BUSINESS_ALIASES,
    degreeName: "Bachelor of Business Administration",
    college: "McCombs School of Business",
    totalCredits: 120,
    courseCatalogId: "business-catalog",
    sourceMetadata: buildSourceMetadata("UT Austin official McCombs advising checklist", BUSINESS_PLAN_PDF_URL),
    entries: parseBusinessPlanEntries(text),
  };
}

export async function loadLiveAcademicCatalogs() {
  const majorsCatalogPromise = loadUndergradMajorsCatalog();
  const plans = await Promise.all([
    loadComputerSciencePlan(),
    loadElectricalEngineeringPlan(),
    loadBiologyPlan(),
    loadBusinessPlan(),
  ]);
  const majorsCatalog = await majorsCatalogPromise;

  const allCourseIds = uniq(plans.flatMap((plan) => plan.entries.map((entry) => entry.courseId))).sort();
  const courseDetails = await mapWithConcurrency(
    allCourseIds,
    COURSE_DETAIL_CONCURRENCY,
    (courseId) => loadCourseDetails(courseId),
  );
  const courseDetailsById = new Map(courseDetails.map((course) => [course.courseId, course]));

  const courseCatalogs = plans.map((plan) => buildCourseCatalog(plan, courseDetailsById));
  const degreePlans = plans.map((plan) => buildDegreePlan(plan, courseDetailsById));

  return {
    majorsCatalog,
    degreePlanCatalog: {
      catalogId: DEGREE_PLAN_CATALOG_ID,
      level: "undergraduate",
      sourceMetadata: buildSourceMetadata(
        "UT Austin official degree plans",
        "https://catalog.utexas.edu/undergraduate/",
        ["Generated from official UT HTML and PDF planning documents during academic sync."],
      ),
      plans: degreePlans,
    },
    scheduleCatalog: buildScheduleCatalog(plans),
    equivalencyArtifact: {
      catalogId: "ut-course-equivalencies",
      sourceMetadata: buildSourceMetadata(
        "Derived UT equivalencies",
        "https://catalog.utexas.edu/course-search",
        ["Only live-derived honors equivalencies are imported."],
      ),
      equivalencies: deriveHonorsEquivalencies(courseCatalogs),
    },
    courseCatalogs,
  };
}
