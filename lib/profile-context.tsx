"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { StudentProfile } from "./types";

const STORAGE_KEY = "hook-profile";

function migrateLegacyProfile(savedProfile: unknown): StudentProfile | null {
  if (!savedProfile || typeof savedProfile !== "object") {
    return null;
  }

  const candidate = savedProfile as StudentProfile & { gpaRange?: string };

  if (typeof candidate.gpa === "number" || candidate.gpa === null) {
    return candidate;
  }

  if (typeof candidate.gpaRange === "string") {
    const numericParts = candidate.gpaRange.match(/[0-4](?:\.\d+)?/g);
    const migratedGpa =
      numericParts && numericParts.length > 0
        ? Math.max(...numericParts.map((value) => Number(value)))
        : null;

    return {
      ...candidate,
      gpa: migratedGpa,
    };
  }

  return {
    ...candidate,
    gpa: null,
  };
}

export const DEMO_PROFILE: StudentProfile = {
  name: "Alex Rivera",
  major: "Computer Science",
  currentSemester: "Spring 2026",
  completedCourses: [
    { courseId: "CS 312", grade: "A", semester: "Fall 2024" },
    { courseId: "CS 314", grade: "A-", semester: "Spring 2025" },
    { courseId: "CS 315", grade: "B+", semester: "Spring 2025" },
    { courseId: "M 408C", grade: "A", semester: "Fall 2024" },
    { courseId: "M 408D", grade: "A-", semester: "Spring 2025" },
  ],
  gpa: 3.78,
  gpaPublic: true,
  residency: "texas",
  financialNeed: "medium",
  resumeSummary:
    "Computer Science student with Python, TypeScript, and ML project experience interested in research, internships, and product-building.",
  skills: ["python", "typescript", "pytorch", "sql", "git"],
  interests: ["machine learning", "education", "student tools", "product design"],
  careerGoal: "research",
  preferredLocations: ["Austin", "Remote"],
  preferredTerms: ["summer", "fall"],
  clubInterests: ["ai", "entrepreneurship", "community service"],
};

interface ProfileContextValue {
  profile: StudentProfile | null;
  setProfile: (profile: StudentProfile) => void;
  clearProfile: () => void;
  isHydrated: boolean;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: PropsWithChildren) {
  const [profile, setProfileState] = useState<StudentProfile | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedProfile = window.sessionStorage.getItem(STORAGE_KEY);
      if (savedProfile) {
        setProfileState(migrateLegacyProfile(JSON.parse(savedProfile)));
      }
    } catch {
      // Ignore malformed session data and allow the app to continue cleanly.
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const setProfile = (nextProfile: StudentProfile) => {
    setProfileState(nextProfile);
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile));
  };

  const clearProfile = () => {
    setProfileState(null);
    window.sessionStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      profile,
      setProfile,
      clearProfile,
      isHydrated,
    }),
    [profile, isHydrated]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }

  return context;
}

