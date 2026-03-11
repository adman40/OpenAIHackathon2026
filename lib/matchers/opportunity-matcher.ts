import type { Opportunity, OpportunityMatch, StudentProfile } from "../types";
import {
  getProfilePreferredLocations,
  getProfilePreferredTerms,
  getProfileResumeSummary,
} from "../profile-utils";

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9+.#-]+/g)
    .filter((token) => token.length > 1);
}

function textIncludesToken(text: string, token: string): boolean {
  return tokenize(text).includes(normalize(token));
}

function majorMatch(profileMajor: string, preferredMajors: string[]): boolean {
  if (preferredMajors.length === 0) {
    return true;
  }
  const major = normalize(profileMajor);
  return preferredMajors.some((candidate) => {
    const preferred = normalize(candidate);
    return major.includes(preferred) || preferred.includes(major);
  });
}

function completedCourseOverlap(
  completedCourseIds: string[],
  preferredCoursework: string[],
): string[] {
  const completed = new Set(completedCourseIds.map((course) => normalize(course)));
  return preferredCoursework.filter((course) => completed.has(normalize(course)));
}

function listOverlap(candidates: string[], haystackText: string): string[] {
  return candidates.filter((item) => {
    const phrase = normalize(item);
    if (!phrase) {
      return false;
    }
    if (normalize(haystackText).includes(phrase)) {
      return true;
    }
    return tokenize(phrase).every((token) => textIncludesToken(haystackText, token));
  });
}

function profileCombinedText(profile: StudentProfile): string {
  return [
    getProfileResumeSummary(profile),
    profile.skills.join(" "),
    profile.interests.join(" "),
    profile.major,
  ].join(" ");
}

function locationMatches(profile: StudentProfile, opportunity: Opportunity): boolean {
  const preferredLocations = getProfilePreferredLocations(profile);
  if (preferredLocations.length === 0) {
    return true;
  }
  const location = normalize(opportunity.location);
  return preferredLocations.some((preferred) => {
    const value = normalize(preferred);
    return location.includes(value) || value.includes(location);
  });
}

function termMatches(profile: StudentProfile, opportunity: Opportunity): boolean {
  const preferredTerms = getProfilePreferredTerms(profile);
  if (preferredTerms.length === 0) {
    return true;
  }
  const term = normalize(opportunity.term);
  return preferredTerms.some((preferred) => {
    const value = normalize(preferred);
    return term.includes(value) || value.includes(term);
  });
}

export function matchOpportunities(
  profile: StudentProfile,
  opportunities: Opportunity[],
): OpportunityMatch[] {
  const combinedText = profileCombinedText(profile);
  const completedCourses = profile.completedCourses.map((course) => course.courseId);

  return opportunities
    .map((opportunity) => {
      const reasons: string[] = [];
      let score = 18;

      if (majorMatch(profile.major, opportunity.preferredMajors)) {
        score += 22;
        reasons.push(`Major alignment: ${profile.major}.`);
      } else {
        score += 4;
      }

      const courseMatches = completedCourseOverlap(
        completedCourses,
        opportunity.preferredCoursework,
      );
      if (courseMatches.length > 0) {
        score += Math.min(18, 8 + courseMatches.length * 4);
        reasons.push(`Completed coursework match: ${courseMatches.slice(0, 3).join(", ")}.`);
      }

      const skillMatches = listOverlap(opportunity.skills, profile.skills.join(" "));
      if (skillMatches.length > 0) {
        score += Math.min(20, 8 + skillMatches.length * 4);
        reasons.push(`Skills overlap: ${skillMatches.slice(0, 3).join(", ")}.`);
      }

      const resumeMatches = listOverlap(opportunity.skills, getProfileResumeSummary(profile));
      if (resumeMatches.length > 0) {
        score += Math.min(12, 4 + resumeMatches.length * 2);
        reasons.push(`Resume summary connects to role skills (${resumeMatches.slice(0, 2).join(", ")}).`);
      }

      const interestMatches = listOverlap(profile.interests, `${opportunity.description} ${opportunity.details}`);
      if (interestMatches.length > 0) {
        score += Math.min(12, 4 + interestMatches.length * 2);
        reasons.push(`Interest alignment: ${interestMatches.slice(0, 2).join(", ")}.`);
      } else {
        const opportunityText = `${opportunity.description} ${opportunity.details} ${opportunity.title}`;
        const genericInterestMatches = listOverlap(tokenize(combinedText), opportunityText);
        if (genericInterestMatches.length > 0) {
          score += 4;
        }
      }

      if (locationMatches(profile, opportunity)) {
        score += 8;
        reasons.push(`Location fit: ${opportunity.location}.`);
      }

      if (termMatches(profile, opportunity)) {
        score += 8;
        reasons.push(`Term fit: ${opportunity.term}.`);
      }

      // Specificity bonus rewards matches with multiple concrete fit signals.
      const specificity = reasons.length;
      if (specificity >= 4) {
        score += 8;
      } else if (specificity >= 2) {
        score += 4;
      }

      return {
        fitScore: Math.max(0, Math.min(100, Math.round(score))),
        matchReasons: reasons.slice(0, 5),
        opportunity,
      };
    })
    .sort((a, b) => {
      if (b.fitScore !== a.fitScore) {
        return b.fitScore - a.fitScore;
      }
      return a.opportunity.applyBy.localeCompare(b.opportunity.applyBy);
    });
}
