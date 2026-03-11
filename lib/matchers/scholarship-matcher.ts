import type { CareerGoal, Scholarship, ScholarshipMatch, StudentProfile } from "../types";
import { formatNumericGpa } from "../transcript/gpa";

type ParsedSignals = {
  residency: string[];
  majors: string[];
  years: string[];
  minGpa: number | null;
  need: string[];
  careerGoals: string[];
  skills: string[];
};

const YEAR_LABELS = ["freshman", "sophomore", "junior", "senior"];

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

function parseLabeledList(signal: string, label: string): string[] {
  const lower = signal.toLowerCase();
  if (!lower.startsWith(`${label.toLowerCase()}:`)) {
    return [];
  }

  return signal
    .slice(label.length + 1)
    .split(",")
    .map((item) => normalize(item))
    .filter(Boolean);
}

function parseSignals(scholarship: Scholarship): ParsedSignals {
  const parsed: ParsedSignals = {
    residency: [],
    majors: [],
    years: [],
    minGpa: null,
    need: [],
    careerGoals: [],
    skills: [],
  };

  scholarship.eligibilitySignals.forEach((signal) => {
    const residency = parseLabeledList(signal, "Residency");
    const majors = parseLabeledList(signal, "Majors");
    const years = parseLabeledList(signal, "Years");
    const need = parseLabeledList(signal, "Need");
    const careerGoals = parseLabeledList(signal, "Career Goals");
    const skills = parseLabeledList(signal, "Skills");

    if (residency.length > 0) {
      parsed.residency = residency;
    }
    if (majors.length > 0) {
      parsed.majors = majors;
    }
    if (years.length > 0) {
      parsed.years = years;
    }
    if (need.length > 0) {
      parsed.need = need;
    }
    if (careerGoals.length > 0) {
      parsed.careerGoals = careerGoals;
    }
    if (skills.length > 0) {
      parsed.skills = skills;
    }

    const gpaMatch = signal.match(/min gpa:\s*([0-4](?:\.\d+)?)/i);
    if (gpaMatch) {
      parsed.minGpa = Number(gpaMatch[1]);
    }
  });

  return parsed;
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

function allowsAny(list: string[]): boolean {
  return list.length === 0 || list.includes("any");
}

function majorMatches(profileMajor: string, majors: string[]): boolean {
  if (allowsAny(majors)) {
    return true;
  }

  const major = normalize(profileMajor);
  return majors.some((candidate) => major.includes(candidate) || candidate.includes(major));
}

function computeSkillsOverlap(profile: StudentProfile, targetSkills: string[]): string[] {
  if (targetSkills.length === 0) {
    return [];
  }

  const combined = `${profile.resumeSummary} ${profile.skills.join(" ")}`;
  const tokens = toTokenSet(combined);

  return targetSkills.filter((skill) => {
    const skillTokens = skill.split(/\s+/).map(normalize).filter(Boolean);
    return skillTokens.every((token) => tokens.has(token));
  });
}

function careerGoalMatches(profileGoal: CareerGoal, goals: string[]): boolean {
  if (allowsAny(goals)) {
    return true;
  }
  return goals.includes(normalize(profileGoal));
}

export function matchScholarships(
  profile: StudentProfile,
  scholarships: Scholarship[],
): ScholarshipMatch[] {
  const year = inferYear(profile);
  const gpa = profile.gpa ?? 0;
  const residency = normalize(profile.residency);
  const need = normalize(profile.financialNeed);
  const major = normalize(profile.major);

  const matches: ScholarshipMatch[] = [];

  scholarships.forEach((scholarship) => {
    const signals = parseSignals(scholarship);

    if (!allowsAny(signals.residency) && !signals.residency.includes(residency)) {
      return;
    }
    if (!allowsAny(signals.years) && !signals.years.includes(year)) {
      return;
    }
    if (!majorMatches(major, signals.majors)) {
      return;
    }
    if (signals.minGpa !== null && gpa + 0.2 < signals.minGpa) {
      return;
    }

    const reasons: string[] = [];
    let score = 20;
    let matchedSpecific = 0;
    let availableSpecific = 0;

    if (!allowsAny(signals.residency)) {
      availableSpecific += 1;
      if (signals.residency.includes(residency)) {
        score += 12;
        matchedSpecific += 1;
        reasons.push(`${profile.residency} residency aligns with eligibility.`);
      }
    } else {
      score += 6;
      reasons.push("Open residency eligibility.");
    }

    if (!allowsAny(signals.majors)) {
      availableSpecific += 1;
      if (majorMatches(major, signals.majors)) {
        score += 14;
        matchedSpecific += 1;
        reasons.push(`${profile.major} is in the target major group.`);
      }
    } else {
      score += 4;
      reasons.push("Major-open scholarship.");
    }

    if (!allowsAny(signals.years)) {
      availableSpecific += 1;
      if (signals.years.includes(year)) {
        score += 10;
        matchedSpecific += 1;
        reasons.push(`Your inferred year (${year}) is eligible.`);
      }
    } else {
      score += 4;
      reasons.push("All class years are eligible.");
    }

    if (signals.minGpa !== null) {
      availableSpecific += 1;
      if (gpa >= signals.minGpa + 0.2) {
        score += 15;
        matchedSpecific += 1;
        reasons.push(`GPA (${formatNumericGpa(profile.gpa)}) is above the minimum ${signals.minGpa.toFixed(1)}.`);
      } else if (gpa >= signals.minGpa) {
        score += 11;
        matchedSpecific += 1;
        reasons.push(`GPA (${formatNumericGpa(profile.gpa)}) meets the minimum ${signals.minGpa.toFixed(1)}.`);
      } else {
        score += 5;
        reasons.push(`GPA is near the minimum ${signals.minGpa.toFixed(1)}.`);
      }
    } else {
      score += 7;
      reasons.push("No strict GPA threshold listed.");
    }

    if (!allowsAny(signals.need)) {
      availableSpecific += 1;
      if (signals.need.includes(need)) {
        score += 12;
        matchedSpecific += 1;
        reasons.push(`Financial need (${profile.financialNeed}) matches scholarship preference.`);
      } else {
        score += 4;
      }
    } else {
      score += 5;
      reasons.push("No strict financial need filter.");
    }

    if (!allowsAny(signals.careerGoals)) {
      availableSpecific += 1;
      if (careerGoalMatches(profile.careerGoal, signals.careerGoals)) {
        score += 10;
        matchedSpecific += 1;
        reasons.push(`Career goal (${profile.careerGoal}) aligns with scholarship intent.`);
      } else {
        score += 3;
      }
    } else {
      score += 4;
      reasons.push("Career-goal flexible scholarship.");
    }

    if (signals.skills.length > 0) {
      availableSpecific += 1;
      const overlap = computeSkillsOverlap(profile, signals.skills);
      if (overlap.length > 0) {
        matchedSpecific += 1;
        score += Math.min(14, 6 + overlap.length * 2);
        reasons.push(`Skills/resume overlap: ${overlap.slice(0, 3).join(", ")}.`);
      } else {
        score += 2;
      }
    } else if (scholarship.favoredQualities.length > 0) {
      const overlap = computeSkillsOverlap(profile, scholarship.favoredQualities.map(normalize));
      if (overlap.length > 0) {
        score += Math.min(10, 4 + overlap.length * 2);
        reasons.push(`Favored qualities overlap: ${overlap.slice(0, 2).join(", ")}.`);
      }
    }

    if (availableSpecific > 0) {
      const ratio = matchedSpecific / availableSpecific;
      score += Math.round(ratio * 13);
      if (availableSpecific >= 4 && ratio >= 0.75) {
        score += 5;
        reasons.push("High specificity fit across multiple eligibility dimensions.");
      }
    }

    const cappedScore = Math.max(0, Math.min(100, Math.round(score)));
    const deadlineDate = new Date(scholarship.deadline);
    const daysUntilDeadline = Math.floor(
      (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    matches.push({
      fitScore: cappedScore,
      matchReasons: reasons.slice(0, 4),
      deadline: scholarship.deadline,
      isUrgent: daysUntilDeadline <= 30,
      scholarship,
    });
  });

  return matches.sort((a, b) => {
    if (b.fitScore !== a.fitScore) {
      return b.fitScore - a.fitScore;
    }
    if (a.isUrgent !== b.isUrgent) {
      return a.isUrgent ? -1 : 1;
    }
    return a.deadline.localeCompare(b.deadline);
  });
}
