import type { StudentProfile } from "./types";

export type RequestSafeStudentProfile = Pick<
  StudentProfile,
  | "email"
  | "utEid"
  | "name"
  | "major"
  | "currentSemester"
  | "completedCourses"
  | "gpa"
  | "gpaPublic"
  | "residency"
  | "financialNeed"
  | "resumeSummary"
  | "skills"
  | "interests"
  | "careerGoal"
  | "preferredLocations"
  | "preferredTerms"
  | "clubInterests"
  | "hoursPerWeek"
  | "transcriptFileName"
  | "resumeFileName"
  | "transcriptUploadStatus"
  | "resumeUploadStatus"
  | "authStatus"
  | "accountMode"
>;

export function toRequestSafeProfile(profile: StudentProfile): RequestSafeStudentProfile {
  return {
    email: profile.email,
    utEid: profile.utEid,
    name: profile.name,
    major: profile.major,
    currentSemester: profile.currentSemester,
    completedCourses: profile.completedCourses,
    gpa: profile.gpa,
    gpaPublic: profile.gpaPublic,
    residency: profile.residency,
    financialNeed: profile.financialNeed,
    resumeSummary: profile.resumeSummary,
    skills: profile.skills,
    interests: profile.interests,
    careerGoal: profile.careerGoal,
    preferredLocations: profile.preferredLocations,
    preferredTerms: profile.preferredTerms,
    clubInterests: profile.clubInterests,
    hoursPerWeek: profile.hoursPerWeek,
    transcriptFileName: profile.transcriptFileName,
    resumeFileName: profile.resumeFileName,
    transcriptUploadStatus: profile.transcriptUploadStatus,
    resumeUploadStatus: profile.resumeUploadStatus,
    authStatus: profile.authStatus,
    accountMode: profile.accountMode,
  };
}
