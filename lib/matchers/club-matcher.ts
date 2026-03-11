import { Club, ClubMatch, StudentProfile } from "../types";
import { getProfileCareerGoal } from "../profile-utils";

function normalize(value: string): string {
  return value.trim().toLowerCase();
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
  const clubInterests = new Set(profile.clubInterests.map(normalize));
  const interests = new Set(profile.interests.map(normalize));
  const major = normalize(profile.major);
  const careerGoalLabel = getProfileCareerGoal(profile);
  const careerGoal = normalize(careerGoalLabel);
  const hoursPerWeek = profile.hoursPerWeek ?? 5;

  // We keep scoring simple so every result stays explainable in the demo.
  return clubs
    .map((club) => {
      const interestTags = club.interestTags.map(normalize);
      const interestOverlap = interestTags.filter(
        (tag) => clubInterests.has(tag) || interests.has(tag),
      );
      const majorMatch = club.majors.map(normalize).includes(major);
      const careerMatch = club.careers.map(normalize).includes(careerGoal);
      const timeFitScore = getTimeFitScore(hoursPerWeek, club.timeCommitment);

      let fitScore = 35;
      fitScore += interestOverlap.length * 14;
      fitScore += majorMatch ? 16 : 0;
      fitScore += careerMatch ? 10 : 0;
      fitScore += timeFitScore;

      const reasons: string[] = [];

      if (interestOverlap.length > 0) {
        reasons.push(`Matches your interests in ${unique(interestOverlap).slice(0, 2).join(" and ")}.`);
      }

      if (majorMatch) {
        reasons.push(`Common pick for ${profile.major} students.`);
      }

      if (careerMatch) {
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
        fitScore: Math.max(0, Math.min(100, fitScore)),
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
