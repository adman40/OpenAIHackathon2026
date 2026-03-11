import fs from "fs";
import path from "path";

const root = process.cwd();

const scholarshipPath = path.join(root, "data", "scholarships", "scholarships.json");
const researchPath = path.join(root, "data", "opportunities", "research.json");
const internshipsPath = path.join(root, "data", "opportunities", "internships.json");

const scholarshipKeys = [
  "id",
  "name",
  "amount",
  "description",
  "eligibilitySignals",
  "favoredQualities",
  "deadline",
  "submissionDetails",
  "link",
  "importTimestamp",
];

const opportunityKeys = [
  "id",
  "kind",
  "title",
  "organization",
  "location",
  "pay",
  "term",
  "datePosted",
  "applyBy",
  "skills",
  "preferredMajors",
  "preferredCoursework",
  "description",
  "details",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isIsoDateTime(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function validateRecords(records, keys, label) {
  assert(Array.isArray(records), `${label} must be an array`);
  assert(records.length > 0, `${label} must not be empty`);
  const ids = new Set();

  for (let i = 0; i < records.length; i += 1) {
    const row = records[i];
    keys.forEach((key) => assert(key in row, `${label}[${i}] missing key: ${key}`));
    assert(typeof row.id === "string" && row.id.length > 0, `${label}[${i}] id must be non-empty string`);
    assert(!ids.has(row.id), `${label} duplicate id: ${row.id}`);
    ids.add(row.id);
  }
}

function validateScholarships(data) {
  validateRecords(data, scholarshipKeys, "scholarships");
  data.forEach((row, i) => {
    assert(typeof row.amount === "number", `scholarships[${i}] amount must be number`);
    assert(Array.isArray(row.eligibilitySignals), `scholarships[${i}] eligibilitySignals must be array`);
    assert(Array.isArray(row.favoredQualities), `scholarships[${i}] favoredQualities must be array`);
    assert(isIsoDate(row.deadline), `scholarships[${i}] deadline must be ISO date`);
    assert(isIsoDateTime(row.importTimestamp), `scholarships[${i}] importTimestamp must be ISO datetime`);
  });
}

function validateOpportunities(data, expectedKind, label) {
  validateRecords(data, opportunityKeys, label);
  data.forEach((row, i) => {
    assert(row.kind === expectedKind, `${label}[${i}] kind must be "${expectedKind}"`);
    assert(Array.isArray(row.skills), `${label}[${i}] skills must be array`);
    assert(Array.isArray(row.preferredMajors), `${label}[${i}] preferredMajors must be array`);
    assert(Array.isArray(row.preferredCoursework), `${label}[${i}] preferredCoursework must be array`);
    assert(isIsoDate(row.datePosted), `${label}[${i}] datePosted must be ISO date`);
    assert(isIsoDate(row.applyBy), `${label}[${i}] applyBy must be ISO date`);
    if (expectedKind === "research") {
      assert(typeof row.sourceUrl === "string" && row.sourceUrl.length > 0, `${label}[${i}] sourceUrl must be non-empty string`);
      assert(Array.isArray(row.contactLeads) && row.contactLeads.length > 0, `${label}[${i}] contactLeads must be non-empty array`);
    }
    if (expectedKind === "internship") {
      assert(typeof row.applyUrl === "string" && row.applyUrl.startsWith("http"), `${label}[${i}] applyUrl must be a valid URL`);
      assert(isIsoDateTime(row.freshnessTimestamp), `${label}[${i}] freshnessTimestamp must be ISO datetime`);
    }
    const posted = new Date(row.datePosted).getTime();
    const applyBy = new Date(row.applyBy).getTime();
    assert(applyBy >= posted, `${label}[${i}] applyBy must be on/after datePosted`);
  });
}

function run() {
  const scholarships = readJson(scholarshipPath);
  const research = readJson(researchPath);
  const internships = readJson(internshipsPath);

  validateScholarships(scholarships);
  validateOpportunities(research, "research", "research");
  validateOpportunities(internships, "internship", "internships");

  console.log("Data integrity checks passed.");
  console.log(`- Scholarships: ${scholarships.length}`);
  console.log(`- Research opportunities: ${research.length}`);
  console.log(`- Internship opportunities: ${internships.length}`);
}

run();
