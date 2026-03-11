import fs from "fs";
import path from "path";

const root = process.cwd();
const SOURCE_URL = "https://admissions.utexas.edu/explore/colleges-degrees/";
const importedAt = new Date().toISOString();

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

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  ).replace(/\d+\s*$/, "").trim();
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

    if (token.type === "p") {
      if (!isPotentialMajorHeading(token.text)) {
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

      continue;
    }

    if (shouldSkipListItem(token.text)) {
      continue;
    }

    const id = slugify(`${college}-${token.text}`);

    if (seen.has(id)) {
      continue;
    }

    const planId = SUPPORTED_MAJOR_PLAN_IDS.get(token.text.toLowerCase());

    majors.push({
      majorId: id,
      displayName: token.text,
      college,
      level: "undergraduate",
      supportStatus: planId ? "supported" : "planned",
      normalizedPlanId: planId,
    });
    seen.add(id);
  }

  return majors;
}

async function run() {
  const response = await fetch(SOURCE_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch UT admissions majors page: ${response.status}`);
  }

  const html = await response.text();
  const sections = extractCollegeSections(html);
  const majors = sections
    .flatMap((section) => parseMajorsForCollege(section.college, section.contentHtml))
    .filter((major) => major.displayName !== "Pre-Law" && major.displayName !== "Pre-Med")
    .filter((major) => !shouldSkipListItem(major.displayName));

  const payload = {
    catalogId: "ut-undergrad-majors",
    level: "undergraduate",
    sourceMetadata: {
      sourceName: "UT Austin Admissions - Colleges & Degrees",
      sourceUrl: SOURCE_URL,
      importedAt,
      notes: [
        "This file is intentionally undergraduate-only.",
        "supportStatus marks majors Hook can currently map into normalized degree-plan analysis.",
      ],
    },
    majors,
  };

  const outputDir = path.join(root, "data", "ut");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, "undergrad-majors.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
  );

  console.log(`Wrote ${majors.length} UT undergraduate majors.`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
