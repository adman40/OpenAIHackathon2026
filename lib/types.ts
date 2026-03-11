// Shared data contract for the Hook MVP.
// Every feature area should build against these types to keep merges predictable.

export type Residency = "texas" | "out-of-state" | "international";

export type FinancialNeed = "low" | "medium" | "high";

export type CareerGoal = "industry" | "research" | "grad_school" | "undecided";

export type OpportunityKind = "research" | "internship" | "new_grad";

export type RecommendationUrgency = "critical" | "recommended" | "optional";

export type RequirementBucket = "core" | "major" | "elective";

export type AcademicSupportStatus = "supported" | "planned";

export interface SourceMetadata {
  sourceName: string;
  sourceUrl: string;
  importedAt: string;
  notes?: string[];
}

export interface DegreeRequirementGroup {
  id: string;
  title: string;
  credits: number;
  courses: string[];
  notes: string;
}

export interface RequirementSection {
  creditsRequired: number;
  groups: DegreeRequirementGroup[];
}

export interface DegreeRequirements {
  degreeId: string;
  degreeName: string;
  college: string;
  totalCredits: number;
  coreRequirements: RequirementSection;
  majorRequirements: RequirementSection;
}

export interface UTUndergraduateMajor {
  majorId: string;
  displayName: string;
  college: string;
  level: "undergraduate";
  supportStatus: AcademicSupportStatus;
  normalizedPlanId?: string;
  degreeLabel?: string;
  specializations?: string[];
}

export interface UTUndergraduateMajorsCatalog {
  catalogId: string;
  level: "undergraduate";
  sourceMetadata: SourceMetadata;
  majors: UTUndergraduateMajor[];
}

export interface NormalizedDegreePlanBucket {
  id: string;
  title: string;
  bucketType: RequirementBucket;
  creditsRequired: number;
  courses: string[];
  notes: string;
}

export interface NormalizedDegreePlan {
  planId: string;
  degreeId: string;
  majorId: string;
  majorName: string;
  aliases: string[];
  degreeName: string;
  college: string;
  level: "undergraduate";
  totalCredits: number;
  courseCatalogId: string;
  supportStatus: AcademicSupportStatus;
  sourceMetadata: SourceMetadata;
  requirementBuckets: NormalizedDegreePlanBucket[];
}

export interface NormalizedDegreePlanCatalog {
  catalogId: string;
  level: "undergraduate";
  sourceMetadata: SourceMetadata;
  plans: NormalizedDegreePlan[];
}

// Student profile types power every Hook surface.
export interface CompletedCourse {
  courseId: string;
  grade: string;
  semester?: string;
  credits?: number;
}

export type TranscriptParseConfidence = "high" | "medium";

export interface ParsedTranscriptCourse extends CompletedCourse {
  rawLine: string;
  lineNumber: number;
  confidence: TranscriptParseConfidence;
  parseWarnings: string[];
}

export interface TranscriptSkippedLine {
  rawLine: string;
  lineNumber: number;
  reason: string;
}

export interface TranscriptParseResult {
  parsedCourses: ParsedTranscriptCourse[];
  skippedLines: TranscriptSkippedLine[];
  reportedGpa: number | null;
  computedGpa: number | null;
  sourceMetadata: {
    parserVersion: string;
    parsedAt: string;
  };
}

export interface StudentProfile {
  name: string;
  major: string;
  currentSemester: string;
  completedCourses: CompletedCourse[];
  gpa: number | null;
  gpaPublic: boolean;
  residency: Residency;
  financialNeed: FinancialNeed;
  resumeSummary: string;
  skills: string[];
  interests: string[];
  careerGoal: CareerGoal;
  preferredLocations: string[];
  preferredTerms: string[];
  clubInterests: string[];
  hoursPerWeek?: number;
}

// Academic types drive course planning and on-track analysis.
export interface Recommendation {
  courseId: string;
  courseName: string;
  requirementBucket: RequirementBucket;
  urgency: RecommendationUrgency;
  rationale: string;
}

export interface EligibleCourse {
  courseId: string;
  courseName: string;
  requirementBucket: RequirementBucket;
  credits: number;
  prerequisites: string[];
  termsOffered: string[];
  professorName: string;
  professorDifficulty: string;
  gradeTendency: string;
  attendancePolicy: string;
}

export interface CourseCatalog {
  catalogId: string;
  degreeId: string;
  courses: EligibleCourse[];
}

export interface AcademicAnalysis {
  percentComplete: number;
  estimatedGraduationSemester: string;
  coreRecommendations: Recommendation[];
  majorRecommendations: Recommendation[];
  eligibleCourses: EligibleCourse[];
  prereqAlerts: string[];
  summary: string;
}

// Scholarship types power the financial aid ranking surface.
export interface Scholarship {
  id: string;
  name: string;
  amount: number;
  description: string;
  eligibilitySignals: string[];
  favoredQualities: string[];
  deadline: string;
  submissionDetails: string;
  link: string;
}

export interface ScholarshipMatch {
  fitScore: number;
  matchReasons: string[];
  deadline: string;
  isUrgent: boolean;
  scholarship: Scholarship;
}

// Opportunity types are shared by research, internships, and new grad roles.
export interface Opportunity {
  id: string;
  kind: OpportunityKind;
  title: string;
  organization: string;
  location: string;
  pay: string;
  term: string;
  datePosted: string;
  applyBy: string;
  skills: string[];
  preferredMajors: string[];
  preferredCoursework: string[];
  description: string;
  details: string;
}

export interface OpportunityMatch {
  fitScore: number;
  matchReasons: string[];
  opportunity: Opportunity;
}

// Club types support community-fit recommendations.
export interface Club {
  id: string;
  name: string;
  category: string;
  description: string;
  interestTags: string[];
  majors: string[];
  careers: string[];
  timeCommitment: string;
  meetingCadence: string;
  joinLink: string;
}

export interface ClubMatch {
  fitScore: number;
  matchReasons: string[];
  timeCommitment: string;
  meetingCadence: string;
  club: Club;
}

// Chat types keep the assistant grounded and explainable.
export interface ChatCitation {
  label: string;
  sourceType: "resource" | "sports" | "academic" | "scholarship" | "opportunity";
  note?: string;
}

export interface ChatResponse {
  answer: string;
  suggestedActions: string[];
  citations: ChatCitation[];
}

