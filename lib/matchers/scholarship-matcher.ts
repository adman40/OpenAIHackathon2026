import type { Scholarship, ScholarshipEligibilityCriteria, ScholarshipMatch, StudentProfile } from "../types";

const YEAR_LABELS = ["freshman", "sophomore", "junior", "senior"] as const;
const MAX_MATCHES = 200;

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function toTokenSet(text: string): Set<string> {
  return new Set(
    normalize(text)
      .split(/[^a-z0-9+.#-]+/g)
      .filter((token) => token.length > 1),
  );
}

function parseProfileGpaHigh(gpaRange: string): number {
  const numbers = gpaRange.match(/[0-4](?:\.\d+)?/g);
  if (!numbers || numbers.length === 0) {
    return 0;
  }

  return Math.max(...numbers.map((value) => Number(value)));
}

function inferYear(profile: StudentProfile): string {
  const summary = normalize(profile.resumeSummary);
  for (const yearLabel of YEAR_LABELS) {
    if (summary.includes(yearLabel)) {
      return yearLabel;
    }
  }

  const completed = profile.completedCourses.length;
  if (completed <= 4) {
    return "freshman";
  }
  if (completed <= 10) {
    return "sophomore";
  }
  if (completed <= 16) {
    return "junior";
  }
  return "senior";
}

function allowsAny(list?: string[]): boolean {
  if (!list || list.length === 0) {
    return true;
  }
  return list.some((entry) => normalize(entry) === "any");
}

function majorMatches(profileMajor: string, majors: string[]): boolean {
  if (allowsAny(majors)) {
    return true;
  }

  const major = normalize(profileMajor);
  return majors.some((candidate) => {
    const normalized = normalize(candidate);
    return major.includes(normalized) || normalized.includes(major);
  });
}

function parseSignalsLegacy(scholarship: Scholarship): ScholarshipEligibilityCriteria {
  const criteria: ScholarshipEligibilityCriteria = {};

  scholarship.eligibilitySignals.forEach((signal) => {
    const lower = normalize(signal);

    if (lower.startsWith("residency:")) {
      const values = signal
        .slice(signal.indexOf(":") + 1)
        .split(",")
        .map((item) => normalize(item))
        .filter(Boolean);
      criteria.residency = values.filter(
        (value): value is "texas" | "out-of-state" | "international" =>
          value === "texas" || value === "out-of-state" || value === "international",
      );
    }

    if (lower.startsWith("majors:")) {
      criteria.majors = signal
        .slice(signal.indexOf(":") + 1)
        .split(",")
        .map((item) => normalize(item))
        .filter(Boolean);
    }

    if (lower.startsWith("years:")) {
      criteria.years = signal
        .slice(signal.indexOf(":") + 1)
        .split(",")
        .map((item) => normalize(item))
        .filter(Boolean);
    }

    if (lower.startsWith("need:")) {
      criteria.needBased = !lower.includes("none") && !lower.includes("not required");
    }

    if (lower.startsWith("skills:")) {
      criteria.keywords = signal
        .slice(signal.indexOf(":") + 1)
        .split(",")
        .map((item) => normalize(item))
        .filter(Boolean);
    }

    const gpaMatch = signal.match(/min gpa:\s*([0-4](?:\.\d+)?)/i);
    if (gpaMatch) {
      criteria.minGpa = Number(gpaMatch[1]);
    }
  });

  return criteria;
}

function getCriteria(scholarship: Scholarship): ScholarshipEligibilityCriteria {
  return scholarship.eligibilityCriteria ?? parseSignalsLegacy(scholarship);
}

function buildProfileTokens(profile: StudentProfile): Set<string> {
  return toTokenSet(
    [
      profile.major,
      profile.resumeSummary,
      profile.skills.join(" "),
      profile.interests.join(" "),
      profile.careerGoal,
      profile.clubInterests.join(" "),
    ].join(" "),
  );
}

function keywordOverlap(tokens: Set<string>, keywords: string[]): string[] {
  return keywords.filter((keyword) => {
    const keywordTokens = normalize(keyword)
      .split(/[^a-z0-9+.#-]+/g)
      .filter(Boolean);
    return keywordTokens.length > 0 && keywordTokens.every((token) => tokens.has(token));
  });
}

function amountBonus(amount: number): number {
  if (amount <= 0) {
    return 0;
  }
  if (amount >= 10000) {
    return 8;
  }
  if (amount >= 5000) {
    return 6;
  }
  if (amount >= 2500) {
    return 4;
  }
  return 2;
}

export function matchScholarships(
  profile: StudentProfile,
  scholarships: Scholarship[],
): ScholarshipMatch[] {
  const year = inferYear(profile);
  const gpaHigh = parseProfileGpaHigh(profile.gpaRange);
  const profileTokens = buildProfileTokens(profile);

  const matches: ScholarshipMatch[] = [];

  scholarships.forEach((scholarship) => {
    const criteria = getCriteria(scholarship);
    const reasons: string[] = [];
    let score = 15;

    if (!allowsAny(criteria.residency) && criteria.residency && !criteria.residency.includes(profile.residency)) {
      return;
    }
    if (!allowsAny(criteria.years) && criteria.years && !criteria.years.includes(year)) {
      return;
    }
    if (criteria.majors && criteria.majors.length > 0 && !majorMatches(profile.major, criteria.majors)) {
      return;
    }
    if (typeof criteria.minGpa === "number" && gpaHigh + 0.15 < criteria.minGpa) {
      return;
    }

    if (!allowsAny(criteria.residency) && criteria.residency) {
      score += 14;
      reasons.push(`${profile.residency} residency matches eligibility.`);
    } else {
      score += 4;
    }

    if (criteria.majors && criteria.majors.length > 0) {
      score += 16;
      reasons.push(`${profile.major} aligns with the listed major preference.`);
    } else {
      score += 4;
    }

    if (!allowsAny(criteria.years) && criteria.years) {
      score += 11;
      reasons.push(`Your inferred class year (${year}) is eligible.`);
    } else {
      score += 3;
    }

    if (typeof criteria.minGpa === "number") {
      if (gpaHigh >= criteria.minGpa + 0.25) {
        score += 13;
        reasons.push(`GPA (${profile.gpaRange}) is above the ${criteria.minGpa.toFixed(2)} minimum.`);
      } else {
        score += 9;
        reasons.push(`GPA (${profile.gpaRange}) meets the ${criteria.minGpa.toFixed(2)} minimum.`);
      }
    } else {
      score += 2;
    }

    if (criteria.needBased) {
      if (profile.financialNeed === "high") {
        score += 14;
        reasons.push("Need-based preference aligns with your reported financial need.");
      } else if (profile.financialNeed === "medium") {
        score += 10;
        reasons.push("Need-based preference partially aligns with your financial profile.");
      } else {
        score += 4;
      }
    }

    if (criteria.fullTimeRequired) {
      score += 3;
      reasons.push("Requires full-time enrollment, which aligns with standard undergraduate status.");
    }

    if (typeof criteria.minCreditHours === "number" && criteria.minCreditHours > 0) {
      const estimatedHours = profile.completedCourses.length * 3;
      if (estimatedHours >= criteria.minCreditHours) {
        score += 8;
        reasons.push(`Estimated completed credits (${estimatedHours}) satisfy the ${criteria.minCreditHours}-hour minimum.`);
      } else {
        score += 2;
      }
    }

    if (typeof criteria.minWorkHoursPerWeek === "number" && profile.hoursPerWeek) {
      if (profile.hoursPerWeek >= criteria.minWorkHoursPerWeek) {
        score += 6;
        reasons.push(`Weekly availability (${profile.hoursPerWeek}h) meets listed hourly expectations.`);
      }
    }

    const keywordCandidates = [
      ...(criteria.keywords ?? []),
      ...scholarship.favoredQualities,
    ];
    const overlap = keywordOverlap(profileTokens, keywordCandidates);
    if (overlap.length > 0) {
      score += Math.min(14, 5 + overlap.length * 2);
      reasons.push(`Profile overlap: ${overlap.slice(0, 3).join(", ")}.`);
    }

    score += amountBonus(scholarship.amount);

    const deadlineDate = new Date(scholarship.deadline);
    const now = Date.now();
    const daysUntilDeadline = Math.floor(
      (deadlineDate.getTime() - now) / (1000 * 60 * 60 * 24),
    );

    if (!Number.isNaN(deadlineDate.getTime())) {
      if (daysUntilDeadline >= 0 && daysUntilDeadline <= 30) {
        score += 8;
      } else if (daysUntilDeadline < 0) {
        score -= 12;
      }
    }

    if (reasons.length === 0) {
      reasons.push("General profile fit based on available scholarship details.");
    }

    const cappedScore = Math.max(0, Math.min(100, Math.round(score)));
    matches.push({
      fitScore: cappedScore,
      matchReasons: reasons.slice(0, 4),
      deadline: scholarship.deadline,
      isUrgent: daysUntilDeadline >= 0 && daysUntilDeadline <= 30,
      scholarship,
    });
  });

  return matches
    .sort((a, b) => {
      if (b.fitScore !== a.fitScore) {
        return b.fitScore - a.fitScore;
      }
      if (a.isUrgent !== b.isUrgent) {
        return a.isUrgent ? -1 : 1;
      }
      return a.deadline.localeCompare(b.deadline);
    })
    .slice(0, MAX_MATCHES);
}
