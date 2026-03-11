import fs from "fs";
import path from "path";

const root = process.cwd();
const SOURCE_URL = "https://admissions.utexas.edu/explore/colleges-degrees/";
const importedAt = new Date().toISOString();

const PLAN_CONFIGS = [
  {
    degreeFile: "cs-bscs.json",
    planId: "computer-science-bs",
    majorId: "computer-science",
    majorName: "Computer Science",
    aliases: ["Computer Science"],
    degreeName: "B.S. in Computer Science",
    college: "College of Natural Sciences",
    courseCatalogId: "cs-catalog",
    sourceNotes: [
      "UT admissions confirms Computer Science as an undergraduate major in the College of Natural Sciences.",
      "Requirement buckets are normalized from Hook's current curated CS degree data.",
    ],
  },
  {
    degreeFile: "ece-bsece.json",
    planId: "electrical-and-computer-engineering-bs",
    majorId: "electrical-and-computer-engineering",
    majorName: "Electrical and Computer Engineering",
    aliases: ["Electrical and Computer Engineering"],
    degreeName: "B.S. in Electrical and Computer Engineering",
    college: "Cockrell School of Engineering",
    courseCatalogId: "ece-catalog",
    sourceNotes: [
      "UT admissions confirms Electrical and Computer Engineering as an undergraduate Cockrell major.",
      "Requirement buckets are normalized from Hook's current curated ECE degree data.",
    ],
  },
  {
    degreeFile: "biology-bsbi.json",
    planId: "biology-bs",
    majorId: "biology",
    majorName: "Biology",
    aliases: ["Biology"],
    degreeName: "B.S. in Biology",
    college: "College of Natural Sciences",
    courseCatalogId: "biology-catalog",
    sourceNotes: [
      "UT admissions confirms Biology as an undergraduate major in the College of Natural Sciences.",
      "Requirement buckets are normalized from Hook's current curated Biology degree data.",
    ],
  },
  {
    degreeFile: "business-bba.json",
    planId: "mccombs-undergraduate-business-bba",
    majorId: "mccombs-undergraduate-business",
    majorName: "McCombs Undergraduate Business",
    aliases: [
      "Accounting",
      "Business Administration",
      "Business Analytics",
      "Finance",
      "International Business",
      "Management",
      "Management Information Systems",
      "Marketing",
      "Supply Chain Management",
    ],
    degreeName: "B.B.A. in Business Administration",
    college: "McCombs School of Business",
    courseCatalogId: "business-catalog",
    sourceNotes: [
      "UT admissions lists McCombs majors individually; Hook currently maps them to one generalized undergraduate business plan for MVP analysis.",
      "Requirement buckets are normalized from Hook's current curated business degree data.",
    ],
  },
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getBucketType(sectionKey, group) {
  const label = `${group.id} ${group.title}`.toLowerCase();

  if (label.includes("elective")) {
    return "elective";
  }

  return sectionKey === "coreRequirements" ? "core" : "major";
}

function buildRequirementBuckets(degree) {
  const sectionKeys = ["coreRequirements", "majorRequirements"];

  return sectionKeys.flatMap((sectionKey) =>
    degree[sectionKey].groups.map((group) => ({
      id: group.id || slugify(group.title),
      title: group.title,
      bucketType: getBucketType(sectionKey, group),
      creditsRequired: group.credits,
      courses: group.courses,
      notes: group.notes,
    })),
  );
}

function run() {
  const plans = PLAN_CONFIGS.map((config) => {
    const degree = readJson(path.join("data", "degrees", config.degreeFile));

    return {
      planId: config.planId,
      degreeId: degree.degreeId,
      majorId: config.majorId,
      majorName: config.majorName,
      aliases: config.aliases,
      degreeName: config.degreeName,
      college: config.college,
      level: "undergraduate",
      totalCredits: degree.totalCredits,
      courseCatalogId: config.courseCatalogId,
      supportStatus: "supported",
      sourceMetadata: {
        sourceName: "UT Austin Admissions + Hook normalized degree plans",
        sourceUrl: SOURCE_URL,
        importedAt,
        notes: config.sourceNotes,
      },
      requirementBuckets: buildRequirementBuckets(degree),
    };
  });

  const payload = {
    catalogId: "ut-undergrad-degree-plans",
    level: "undergraduate",
    sourceMetadata: {
      sourceName: "UT Austin Admissions + Hook normalized degree plans",
      sourceUrl: SOURCE_URL,
      importedAt,
      notes: [
        "This file preserves a normalized undergrad-only degree-plan format for Hook.",
        "Current plans cover Hook-supported demo majors and stay consumable by the existing academic analysis engine through an adapter.",
      ],
    },
    plans,
  };

  const outputDir = path.join(root, "data", "ut");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, "undergrad-degree-plans.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
  );

  console.log(`Wrote ${plans.length} normalized degree plans.`);
}

run();
