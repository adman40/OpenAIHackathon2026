#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { load } from "cheerio";

const SOURCES = [
  {
    key: "exl",
    url: "https://exl.cns.utexas.edu/do-research/research-major",
    organization: "UT CNS Office of Experiential Learning",
    defaultContact: "exl@cns.utexas.edu",
  },
  {
    key: "research",
    url: "https://research.utexas.edu/research-centers-units",
    organization: "UT Office of the Vice President for Research",
    defaultContact: "research@utexas.edu",
  },
  {
    key: "dellmed",
    url: "https://dellmed.utexas.edu/research/faculty-research-labs",
    organization: "Dell Medical School",
    defaultContact: "Office of Research, Dell Medical School",
  },
  {
    key: "neuro",
    url: "https://neuroscience.utexas.edu/academics/undergraduate-study/undergraduate-research-labs",
    organization: "UT Department of Neuroscience",
    defaultContact: "Neuroscience undergraduate advising",
  },
  {
    key: "cockrell",
    url: "https://cockrell.utexas.edu/research/",
    organization: "Cockrell School of Engineering",
    defaultContact: "comm@engr.utexas.edu",
  },
  {
    key: "fri",
    url: "https://fri.cns.utexas.edu/research-streams",
    organization: "Freshman Research Initiative",
    defaultContact: "fri@utexas.edu",
  },
];

const SKILL_KEYWORDS = [
  "python",
  "r",
  "matlab",
  "c++",
  "machine learning",
  "data analysis",
  "statistics",
  "bioinformatics",
  "molecular biology",
  "cell culture",
  "neuroscience",
  "imaging",
  "chemistry",
  "physics",
  "robotics",
  "controls",
  "cad",
  "simulation",
  "field research",
  "gis",
  "climate",
  "energy systems",
  "signal processing",
  "literature review",
  "technical writing",
  "communication",
  "experimental design",
  "research ethics",
  "wet lab",
  "sensors",
];

const MAJOR_KEYWORDS = [
  "computer science",
  "data science",
  "statistics",
  "mathematics",
  "biology",
  "biochemistry",
  "chemistry",
  "neuroscience",
  "physics",
  "astronomy",
  "electrical engineering",
  "mechanical engineering",
  "biomedical engineering",
  "chemical engineering",
  "civil engineering",
  "environmental engineering",
  "public health",
  "psychology",
  "economics",
  "geology",
  "geophysics",
  "pharmacy",
  "nursing",
  "social work",
  "architecture",
];

const COURSEWORK_MAP = {
  "computer science": ["CS 312", "CS 314", "CS 329E"],
  "data science": ["SDS 321", "CS 329E", "STA 309"],
  statistics: ["SDS 321", "STA 309", "M 341"],
  mathematics: ["M 408D", "M 340L", "M 341"],
  biology: ["BIO 311C", "BIO 311D", "CH 204"],
  biochemistry: ["CH 328M", "BIO 311C", "BIO 325"],
  chemistry: ["CH 301", "CH 302", "CH 204"],
  neuroscience: ["NEU 330", "BIO 325", "PSY 301"],
  physics: ["PHY 303K", "PHY 303L", "M 408D"],
  astronomy: ["AST 301", "PHY 301", "M 408D"],
  "electrical engineering": ["EE 302", "EE 306", "EE 313"],
  "mechanical engineering": ["ME 302", "ME 318M", "M 340L"],
  "biomedical engineering": ["BME 303", "BME 335", "BIO 311C"],
  "chemical engineering": ["CHE 317", "CHE 319", "CH 302"],
  "civil engineering": ["CE 301", "CE 311K", "M 408D"],
  "environmental engineering": ["CE 311K", "BIO 311C", "CH 301"],
  "public health": ["PBH 317", "BIO 311C", "SDS 321"],
  psychology: ["PSY 301", "PSY 317", "SDS 321"],
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
    .slice(0, 100);
}

function toAbsoluteUrl(base, href) {
  if (!href) {
    return base;
  }

  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }

  try {
    return new URL(href, base).toString();
  } catch {
    return base;
  }
}

function extractEmails(text) {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/g);
  if (!matches) {
    return [];
  }
  return [...new Set(matches.map((entry) => entry.toLowerCase()))];
}

function inferSkills(title, description) {
  const haystack = `${title} ${description}`.toLowerCase();
  const matched = SKILL_KEYWORDS.filter((skill) => haystack.includes(skill));

  const seeded = ["communication", "research ethics", "technical writing"];
  const merged = [...new Set([...matched, ...seeded])];
  return merged.slice(0, 8);
}

function inferMajors(title, description) {
  const haystack = `${title} ${description}`.toLowerCase();
  const matched = MAJOR_KEYWORDS.filter((major) => haystack.includes(major));

  if (matched.length > 0) {
    return matched.slice(0, 6);
  }

  if (haystack.includes("engineering")) {
    return ["electrical engineering", "mechanical engineering", "civil engineering"];
  }
  if (haystack.includes("medical") || haystack.includes("health")) {
    return ["biology", "public health", "neuroscience"];
  }

  return ["computer science", "biology", "engineering"];
}

function inferCoursework(majors, skills) {
  const courses = new Set();

  majors.forEach((major) => {
    (COURSEWORK_MAP[major] ?? []).forEach((course) => courses.add(course));
  });

  if (skills.some((skill) => ["python", "machine learning", "data analysis"].includes(skill))) {
    ["CS 312", "CS 329E", "SDS 321"].forEach((course) => courses.add(course));
  }
  if (skills.some((skill) => ["wet lab", "molecular biology", "cell culture"].includes(skill))) {
    ["BIO 311C", "CH 204"].forEach((course) => courses.add(course));
  }
  if (skills.some((skill) => ["robotics", "controls", "sensors"].includes(skill))) {
    ["EE 306", "ME 318M"].forEach((course) => courses.add(course));
  }

  return Array.from(courses).slice(0, 6);
}

function inferTerm(text) {
  const lower = text.toLowerCase();
  if (lower.includes("summer")) {
    return "summer";
  }
  if (lower.includes("spring")) {
    return "spring";
  }
  if (lower.includes("fall")) {
    return "fall";
  }
  return "academic year";
}

function buildEntry({ source, title, description, link, contactLeads, organization }) {
  const cleanTitle = normalizeWhitespace(title);
  const cleanDescription = normalizeWhitespace(description);
  if (!cleanTitle || cleanTitle.length < 4) {
    return null;
  }

  const majors = inferMajors(cleanTitle, cleanDescription);
  const skills = inferSkills(cleanTitle, cleanDescription);
  const coursework = inferCoursework(majors, skills);

  return {
    key: `${source.key}|${cleanTitle.toLowerCase()}`,
    kind: "research",
    title: cleanTitle,
    organization: organization ?? source.organization,
    location: "Austin",
    pay: "Varies by lab/program",
    term: inferTerm(cleanDescription),
    datePosted: null,
    applyBy: null,
    skills,
    preferredMajors: majors,
    preferredCoursework: coursework,
    description:
      cleanDescription ||
      "Undergraduate-friendly UT research pathway; review source page for current openings and process.",
    details: `Explore this UT-backed lab/program and contact the listed lead for current undergraduate participation steps.`,
    contactLeads: contactLeads.length > 0 ? contactLeads : [source.defaultContact],
    sourceUrl: link || source.url,
  };
}

function parseExl(source, html) {
  const $ = load(html);
  const items = [];

  $(".formatted h2").each((_, heading) => {
    const major = normalizeWhitespace($(heading).text());
    if (!major) {
      return;
    }

    const block = $(heading).closest(".formatted");
    block.find("li a").each((__, anchor) => {
      const label = normalizeWhitespace($(anchor).text());
      const href = toAbsoluteUrl(source.url, $(anchor).attr("href") ?? "");

      if (!label || !href.includes("utexas.edu")) {
        return;
      }
      if (/scholarship|funding|award|fellowship/i.test(label)) {
        return;
      }

      const entry = buildEntry({
        source,
        title: `${label} (${major})`,
        description: `On-campus research pathway listed for ${major} students in UT CNS Research by Major resources.`,
        link: href,
        contactLeads: [source.defaultContact],
        organization: `UT ${major}`,
      });

      if (entry) {
        items.push(entry);
      }
    });
  });

  return items;
}

function parseResearchCenters(source, html) {
  const $ = load(html);
  const items = [];

  const scopedAnchors = $(".ut-copy a");
  scopedAnchors.each((_, anchor) => {
    const label = normalizeWhitespace($(anchor).text());
    const href = toAbsoluteUrl(source.url, $(anchor).attr("href") ?? "");
    if (!label || !href.includes("utexas.edu")) {
      return;
    }
    if (!/center|institute|laborator|research|unit|facility/i.test(label)) {
      return;
    }

    const parentText = normalizeWhitespace($(anchor).closest("section, p, li, div").text());
    const emails = extractEmails(parentText);

    const entry = buildEntry({
      source,
      title: label,
      description: parentText || "UT research center/unit listed by the Office of the Vice President for Research.",
      link: href,
      contactLeads: emails,
      organization: "UT Research Center/Unit Network",
    });

    if (entry) {
      items.push(entry);
    }
  });

  return items;
}

function parseDellMed(source, html) {
  const $ = load(html);
  const items = [];

  $(".module--accordion li").each((_, li) => {
    const anchor = $(li).find("a").first();
    const label = normalizeWhitespace(anchor.text());
    const href = toAbsoluteUrl(source.url, anchor.attr("href") ?? "");
    if (!label || !href.includes("http")) {
      return;
    }

    const fullText = normalizeWhitespace($(li).text());
    const description = fullText.includes(":")
      ? normalizeWhitespace(fullText.split(":").slice(1).join(":"))
      : `Dell Med affiliated lab focused on ${label}.`;

    const entry = buildEntry({
      source,
      title: label,
      description,
      link: href,
      contactLeads: [source.defaultContact],
      organization: "Dell Medical School Faculty Research Labs",
    });

    if (entry) {
      items.push(entry);
    }
  });

  return items;
}

function parseNeuro(source, html) {
  const $ = load(html);
  const items = [];

  const generalDescription = normalizeWhitespace(
    $("main").text().slice(0, 900),
  );

  const baseEntry = buildEntry({
    source,
    title: "Undergraduate Neuroscience Research Labs Pathway",
    description:
      generalDescription ||
      "Guidance from the UT Department of Neuroscience on joining undergraduate research labs and contacting faculty mentors.",
    link: source.url,
    contactLeads: [source.defaultContact],
    organization: source.organization,
  });

  if (baseEntry) {
    items.push(baseEntry);
  }

  $("a").each((_, anchor) => {
    const label = normalizeWhitespace($(anchor).text());
    const href = toAbsoluteUrl(source.url, $(anchor).attr("href") ?? "");

    if (!label || !href.includes("utexas.edu")) {
      return;
    }
    if (!/faculty|eureka|research lab|student-experience|projects/i.test(label)) {
      return;
    }

    const entry = buildEntry({
      source,
      title: `${label} (Neuroscience)` ,
      description: "UT Neuroscience undergraduate research navigation resource.",
      link: href,
      contactLeads: [source.defaultContact],
      organization: source.organization,
    });

    if (entry) {
      items.push(entry);
    }
  });

  return items;
}

function parseCockrell(source, html) {
  const $ = load(html);
  const items = [];

  const researchLinks = new Set([
    "https://cockrell.utexas.edu/research/areas-of-impact/",
    "https://cockrell.utexas.edu/research/research-centers/",
    "https://cockrell.utexas.edu/research/bridging-barriers/",
    "https://cockrell.utexas.edu/research/innovation-center/",
    "https://cockrell.utexas.edu/research/office-of-the-associate-dean-for-research/",
  ]);

  $("a").each((_, anchor) => {
    const href = toAbsoluteUrl(source.url, $(anchor).attr("href") ?? "");
    if (!researchLinks.has(href)) {
      return;
    }

    const label = normalizeWhitespace($(anchor).text());
    const entry = buildEntry({
      source,
      title: label || "Cockrell Research Program",
      description:
        "Cockrell research pathway with multidisciplinary engineering labs and centers supporting undergraduate research engagement.",
      link: href,
      contactLeads: [source.defaultContact],
      organization: source.organization,
    });

    if (entry) {
      items.push(entry);
    }
  });

  return items;
}

function parseFri(source, html) {
  const $ = load(html);
  const items = [];

  $("a.flex.group").each((_, card) => {
    const title = normalizeWhitespace($(card).find("h2").first().text());
    if (!title) {
      return;
    }

    const href = toAbsoluteUrl(source.url, $(card).attr("href") ?? "");
    const description = normalizeWhitespace($(card).find(".formatted p").text());

    const entry = buildEntry({
      source,
      title: `${title} Research Stream`,
      description:
        description ||
        `Freshman Research Initiative stream with undergraduate-first lab training and project experience.`,
      link: href,
      contactLeads: [source.defaultContact],
      organization: source.organization,
    });

    if (entry) {
      items.push(entry);
    }
  });

  return items;
}

function parserFor(sourceKey) {
  switch (sourceKey) {
    case "exl":
      return parseExl;
    case "research":
      return parseResearchCenters;
    case "dellmed":
      return parseDellMed;
    case "neuro":
      return parseNeuro;
    case "cockrell":
      return parseCockrell;
    case "fri":
      return parseFri;
    default:
      return () => [];
  }
}

function scoreUndergradFriendliness(entry) {
  const haystack = `${entry.title} ${entry.description}`.toLowerCase();
  let score = 0;

  if (/undergraduate|freshman|student/.test(haystack)) {
    score += 3;
  }
  if (/research stream|lab|center|program/.test(haystack)) {
    score += 2;
  }
  if (/funding|scholarship|award/.test(haystack)) {
    score -= 2;
  }

  return score;
}

async function main() {
  const importedAt = new Date().toISOString();
  const datePosted = importedAt.slice(0, 10);
  const applyBy = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const collected = [];

  for (const source of SOURCES) {
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "hook-research-importer/1.0",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${source.url}: ${response.status}`);
    }

    const html = await response.text();
    const parser = parserFor(source.key);
    const parsed = parser(source, html);
    collected.push(...parsed);
  }

  const deduped = new Map();
  collected.forEach((entry) => {
    const existing = deduped.get(entry.key);
    if (!existing) {
      deduped.set(entry.key, entry);
      return;
    }

    if ((entry.description?.length ?? 0) > (existing.description?.length ?? 0)) {
      deduped.set(entry.key, entry);
    }
  });

  const finalRows = Array.from(deduped.values())
    .filter((entry) => scoreUndergradFriendliness(entry) >= 1)
    .map((entry) => ({
      id: `res-ut-${slugify(entry.title)}`,
      kind: "research",
      title: entry.title,
      organization: entry.organization,
      location: entry.location,
      pay: entry.pay,
      term: entry.term,
      datePosted,
      applyBy,
      skills: entry.skills,
      preferredMajors: entry.preferredMajors,
      preferredCoursework: entry.preferredCoursework,
      description: entry.description,
      details: `${entry.details} Source: ${entry.sourceUrl}`,
      contactLeads: entry.contactLeads,
      sourceUrl: entry.sourceUrl,
      importTimestamp: importedAt,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const rows = [];
  const idCounts = new Map();
  finalRows.forEach((row) => {
    const count = (idCounts.get(row.id) ?? 0) + 1;
    idCounts.set(row.id, count);
    if (count === 1) {
      rows.push(row);
    } else {
      rows.push({ ...row, id: `${row.id}-${count}` });
    }
  });

  const root = process.cwd();
  const opportunitiesDir = path.join(root, "data", "opportunities");
  await fs.mkdir(opportunitiesDir, { recursive: true });

  const researchPath = path.join(opportunitiesDir, "research.json");
  const catalogPath = path.join(opportunitiesDir, "ut-lab-catalog.json");
  const metadataPath = path.join(opportunitiesDir, "ut-lab-import-metadata.json");

  await fs.writeFile(researchPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  await fs.writeFile(catalogPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  await fs.writeFile(
    metadataPath,
    `${JSON.stringify(
      {
        importedAt,
        sourceCount: SOURCES.length,
        recordCount: rows.length,
        sources: SOURCES.map((source) => source.url),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`Imported ${rows.length} UT lab/program opportunities.`);
  console.log(`Wrote ${path.relative(root, researchPath)}`);
  console.log(`Wrote ${path.relative(root, catalogPath)}`);
  console.log(`Wrote ${path.relative(root, metadataPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
