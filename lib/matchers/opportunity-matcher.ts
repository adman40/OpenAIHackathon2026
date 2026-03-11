import type { Opportunity, OpportunityMatch, StudentProfile } from "../types";

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
    profile.resumeSummary,
    profile.skills.join(" "),
    profile.interests.join(" "),
    profile.major,
  ].join(" ");
}

function profileKeywordAffinity(profile: StudentProfile, opportunity: Opportunity): string[] {
  const profileTerms = [
    ...profile.skills,
    ...profile.interests,
    profile.major,
    profile.careerGoal.replace("_", " "),
  ];
  const opportunityText = `${opportunity.title} ${opportunity.organization} ${opportunity.description} ${opportunity.details}`;
  return listOverlap(profileTerms, opportunityText);
}

function freshnessBonus(opportunity: Opportunity): number {
  if (!opportunity.freshnessTimestamp) {
    return 0;
  }

  const freshness = new Date(opportunity.freshnessTimestamp);
  if (Number.isNaN(freshness.getTime())) {
    return 0;
  }

  const ageDays = Math.floor((Date.now() - freshness.getTime()) / (1000 * 60 * 60 * 24));
  if (ageDays <= 1) {
    return 7;
  }
  if (ageDays <= 7) {
    return 5;
  }
  if (ageDays <= 21) {
    return 3;
  }
  return 1;
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

      const resumeMatches = listOverlap(opportunity.skills, profile.resumeSummary);
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

      const affinityMatches = profileKeywordAffinity(profile, opportunity);
      if (affinityMatches.length > 0) {
        score += Math.min(10, 3 + affinityMatches.length * 2);
        reasons.push(`Lab/program topic overlap: ${affinityMatches.slice(0, 2).join(", ")}.`);
      }

      const freshnessScore = freshnessBonus(opportunity);
      if (freshnessScore > 0) {
        score += freshnessScore;
        reasons.push("Posting appears recently refreshed.");
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
