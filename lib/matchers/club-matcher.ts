import { Club, ClubMatch, StudentProfile } from "../types";
import { getProfileCareerGoal } from "../profile-utils";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[^a-z0-9+]+/i)
    .map((token) => token.trim())
    .filter(Boolean);
}

function parseTimeCommitmentHours(timeCommitment: string): number {
  const match = timeCommitment.match(/(\d+)(?:\s*-\s*(\d+))?/);

  if (!match) {
    return 4;
  }

  const low = Number(match[1]);
  const high = match[2] ? Number(match[2]) : low;

  return (low + high) / 2;
}

function getTimeFitScore(hoursPerWeek: number, timeCommitment: string): number {
  const clubHours = parseTimeCommitmentHours(timeCommitment);
  const gap = hoursPerWeek - clubHours;

  if (gap >= 1) {
    return 20;
  }

  if (gap >= -1) {
    return 10;
  }

  if (gap >= -3) {
    return 2;
  }

  return -8;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function matchClubs(profile: StudentProfile, clubs: Club[]): ClubMatch[] {
  const clubInterestValues = profile.clubInterests.map(normalize);
  const interestValues = profile.interests.map(normalize);
  const clubInterests = new Set(clubInterestValues);
  const interests = new Set(interestValues);
  const keywordTokens = new Set(
    unique([...clubInterestValues, ...interestValues].flatMap((value) => tokenize(value))),
  );
  const major = normalize(profile.major);
  const careerGoalLabel = getProfileCareerGoal(profile);
  const careerGoal = normalize(careerGoalLabel);
  const hoursPerWeek = profile.hoursPerWeek ?? 5;

  return clubs
    .map((club) => {
      const interestTags = club.interestTags.map(normalize);
      const clubTextTokens = new Set(
        tokenize(
          `${club.name} ${club.description} ${club.category} ${club.interestTags.join(" ")}`,
        ),
      );
      const interestOverlap = interestTags.filter(
        (tag) => clubInterests.has(tag) || interests.has(tag),
      );
      const keywordOverlap = Array.from(keywordTokens).filter((token) => clubTextTokens.has(token));
      const majorOptions = club.majors.map(normalize);
      const majorMatch =
        majorOptions.length === 0 ||
        majorOptions.some((candidate) => candidate === major || major.includes(candidate) || candidate.includes(major));
      const careerOptions = club.careers.map(normalize);
      const careerMatch = careerOptions.length === 0 || careerOptions.includes(careerGoal);
      const timeFitScore = getTimeFitScore(hoursPerWeek, club.timeCommitment);

      let fitScore = 44;
      fitScore += Math.min(interestOverlap.length, 2) * 12;
      fitScore += Math.min(keywordOverlap.length, 3) * 10;
      fitScore += majorMatch ? 10 : 0;
      fitScore += careerMatch ? 6 : 0;
      fitScore += timeFitScore;

      if (interestOverlap.length === 0 && keywordOverlap.length === 0) {
        fitScore -= 10;
      }

      if (!majorMatch && majorOptions.length > 0) {
        fitScore -= 5;
      }

      const reasons: string[] = [];

      if (interestOverlap.length > 0) {
        reasons.push(`Matches your interests in ${unique(interestOverlap).slice(0, 2).join(" and ")}.`);
      }

      if (keywordOverlap.length > 0) {
        reasons.push(
          `Directly lines up with keywords like ${unique(keywordOverlap).slice(0, 2).join(" and ")}.`,
        );
      }

      if (majorOptions.length > 0 && majorMatch) {
        reasons.push(`Common pick for ${profile.major} students.`);
      }

      if (careerOptions.length > 0 && careerMatch) {
        reasons.push(`Fits your ${careerGoalLabel.replace("_", " ")} goals.`);
      }

      if (timeFitScore >= 10) {
        reasons.push(`Fits your ${hoursPerWeek} hours/week availability.`);
      } else if (timeFitScore > 0) {
        reasons.push("Could work with a slightly tight weekly schedule.");
      } else {
        reasons.push("Higher commitment than your current weekly availability.");
      }

      return {
        fitScore: Math.max(18, Math.min(98, Math.round(fitScore))),
        matchReasons: reasons.slice(0, 3),
        timeCommitment: club.timeCommitment,
        meetingCadence: club.meetingCadence,
        club,
      };
    })
    .sort((left, right) => {
      if (right.fitScore !== left.fitScore) {
        return right.fitScore - left.fitScore;
      }

      return left.club.name.localeCompare(right.club.name);
    });
}
