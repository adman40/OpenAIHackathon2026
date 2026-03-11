/* eslint-disable no-console */
const baseUrl = process.env.HOOK_BASE_URL || "http://localhost:3000";

const profile = {
  name: "Alex Rivera",
  major: "Computer Science",
  currentSemester: "Spring 2026",
  completedCourses: [
    { courseId: "CS 312", grade: "A" },
    { courseId: "CS 314", grade: "A-" },
    { courseId: "SDS 321", grade: "A" },
  ],
  gpaRange: "3.5-4.0",
  gpaPublic: true,
  residency: "texas",
  financialNeed: "medium",
  resumeSummary: "CS student with Python and TypeScript project experience.",
  skills: ["python", "typescript", "sql"],
  interests: ["machine learning", "education", "product engineering"],
  careerGoal: "research",
  preferredLocations: ["Austin", "Remote"],
  preferredTerms: ["summer", "fall"],
  clubInterests: ["ai", "entrepreneurship"],
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function post(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });
  return response;
}

function validateMatchArray(label, payload) {
  assert(payload && Array.isArray(payload.matches), `${label}: payload.matches must be an array`);
  assert(payload.matches.length > 0, `${label}: expected non-empty matches`);
}

function validateScholarshipMatch(payload) {
  const first = payload.matches[0];
  assert(typeof first.fitScore === "number", "scholarships: fitScore must be number");
  assert(Array.isArray(first.matchReasons), "scholarships: matchReasons must be array");
  assert(typeof first.deadline === "string", "scholarships: deadline must be string");
  assert(typeof first.isUrgent === "boolean", "scholarships: isUrgent must be boolean");
  assert(first.scholarship && typeof first.scholarship.id === "string", "scholarships: scholarship.id missing");
}

function validateOpportunityMatch(label, payload) {
  const first = payload.matches[0];
  assert(typeof first.fitScore === "number", `${label}: fitScore must be number`);
  assert(Array.isArray(first.matchReasons), `${label}: matchReasons must be array`);
  assert(first.opportunity && typeof first.opportunity.id === "string", `${label}: opportunity.id missing`);
  assert(typeof first.opportunity.applyBy === "string", `${label}: opportunity.applyBy missing`);
}

async function run() {
  console.log(`Running API smoke tests against ${baseUrl}`);

  const scholarshipsResponse = await post("/api/scholarships/match");
  assert(scholarshipsResponse.ok, `scholarships: request failed with ${scholarshipsResponse.status}`);
  const scholarshipsPayload = await scholarshipsResponse.json();
  validateMatchArray("scholarships", scholarshipsPayload);
  validateScholarshipMatch(scholarshipsPayload);
  console.log(`- scholarships: ${scholarshipsPayload.matches.length} matches`);

  const researchResponse = await post("/api/research/match");
  assert(researchResponse.ok, `research: request failed with ${researchResponse.status}`);
  const researchPayload = await researchResponse.json();
  validateMatchArray("research", researchPayload);
  validateOpportunityMatch("research", researchPayload);
  console.log(`- research: ${researchPayload.matches.length} matches`);

  const internshipsResponse = await post("/api/internships/match");
  assert(internshipsResponse.ok, `internships: request failed with ${internshipsResponse.status}`);
  const internshipsPayload = await internshipsResponse.json();
  validateMatchArray("internships", internshipsPayload);
  validateOpportunityMatch("internships", internshipsPayload);
  console.log(`- internships: ${internshipsPayload.matches.length} matches`);

  console.log("API smoke tests passed.");
}

run().catch((error) => {
  console.error("API smoke tests failed:", error.message);
  process.exit(1);
});
