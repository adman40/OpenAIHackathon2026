"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { buildSeedCourses, normalizeProfile } from "./profile-utils";
import { getSupabaseBrowserClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/env";
import type {
  AuthStatus,
  ProfilePersistenceMode,
  StudentProfile,
} from "./types";

const PROFILE_STORAGE_KEY = "hook-profile";
const FALLBACK_AUTH_KEY = "hook-auth";
const FALLBACK_DRAFT_KEY = "hook-pending-profile";

type FallbackAuthRecord = {
  email: string;
  password: string;
  fullName: string;
  utEid: string;
  verified: boolean;
};

type AuthInput = {
  email: string;
  password: string;
  fullName: string;
  utEid: string;
};

type SignInInput = {
  email: string;
  password: string;
};

type ProfileRow = {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  ut_eid: string;
  major: string;
  current_semester: string;
  gpa: number | null;
  residency: StudentProfile["residency"];
  financial_need: StudentProfile["financialNeed"];
  completed_courses: StudentProfile["completedCourses"];
  resume_summary: string | null;
  skills: string[];
  interests: string[];
  club_interests: string[];
  hours_per_week: number | null;
  profile_photo_url: string | null;
  transcript_file_name: string | null;
  resume_file_name: string | null;
  transcript_upload_status: StudentProfile["transcriptUploadStatus"] | null;
  resume_upload_status: StudentProfile["resumeUploadStatus"] | null;
  legacy_fields: {
    careerGoal?: StudentProfile["careerGoal"];
    preferredLocations?: string[];
    preferredTerms?: string[];
    gpaRange?: string;
  } | null;
  created_at: string;
  updated_at: string;
};

type ProfileSettingsRow = {
  gpa_public: boolean;
  auth_status: AuthStatus;
  account_mode: ProfilePersistenceMode;
};

function isUtEmail(email: string) {
  return email.trim().toLowerCase().endsWith("@utexas.edu");
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function clearFallbackStorage() {
  window.localStorage.removeItem(PROFILE_STORAGE_KEY);
  window.localStorage.removeItem(FALLBACK_AUTH_KEY);
  window.localStorage.removeItem(FALLBACK_DRAFT_KEY);
}

function fromSupabaseRows(
  profileRow: ProfileRow,
  settingsRow: ProfileSettingsRow | null,
): StudentProfile {
  return normalizeProfile({
    id: profileRow.id,
    authUserId: profileRow.auth_user_id,
    email: profileRow.email,
    utEid: profileRow.ut_eid,
    name: profileRow.full_name,
    major: profileRow.major,
    currentSemester: profileRow.current_semester,
    completedCourses: profileRow.completed_courses ?? [],
    gpa: profileRow.gpa,
    gpaRange: profileRow.legacy_fields?.gpaRange,
    gpaPublic: settingsRow?.gpa_public ?? true,
    residency: profileRow.residency,
    financialNeed: profileRow.financial_need,
    resumeSummary: profileRow.resume_summary ?? "",
    skills: profileRow.skills ?? [],
    interests: profileRow.interests ?? [],
    careerGoal: profileRow.legacy_fields?.careerGoal,
    preferredLocations: profileRow.legacy_fields?.preferredLocations ?? [],
    preferredTerms: profileRow.legacy_fields?.preferredTerms ?? [],
    clubInterests: profileRow.club_interests ?? [],
    hoursPerWeek: profileRow.hours_per_week ?? undefined,
    profilePhotoUrl: profileRow.profile_photo_url,
    transcriptFileName: profileRow.transcript_file_name,
    resumeFileName: profileRow.resume_file_name,
    transcriptUploadStatus: profileRow.transcript_upload_status ?? "missing",
    resumeUploadStatus: profileRow.resume_upload_status ?? "missing",
    authStatus: settingsRow?.auth_status ?? "authenticated",
    accountMode: settingsRow?.account_mode ?? "supabase",
    createdAt: profileRow.created_at,
    updatedAt: profileRow.updated_at,
  });
}

function toSupabaseProfileRow(profile: StudentProfile, authUserId: string) {
  return {
    auth_user_id: authUserId,
    email: profile.email,
    full_name: profile.name,
    ut_eid: profile.utEid,
    major: profile.major,
    current_semester: profile.currentSemester,
    gpa: profile.gpa,
    residency: profile.residency,
    financial_need: profile.financialNeed,
    completed_courses: profile.completedCourses,
    resume_summary: profile.resumeSummary ?? null,
    skills: profile.skills,
    interests: profile.interests,
    club_interests: profile.clubInterests,
    hours_per_week: profile.hoursPerWeek ?? null,
    profile_photo_url: profile.profilePhotoUrl ?? null,
    transcript_file_name: profile.transcriptFileName ?? null,
    resume_file_name: profile.resumeFileName ?? null,
    transcript_upload_status: profile.transcriptUploadStatus ?? "missing",
    resume_upload_status: profile.resumeUploadStatus ?? "missing",
    legacy_fields: {
      careerGoal: profile.careerGoal,
      preferredLocations: profile.preferredLocations ?? [],
      preferredTerms: profile.preferredTerms ?? [],
      gpaRange: profile.gpaRange,
    },
  };
}

export const DEMO_PROFILE: StudentProfile = normalizeProfile({
  email: "demo@utexas.edu",
  utEid: "demo123",
  name: "Alex Rivera",
  major: "Computer Science",
  currentSemester: "Spring 2026",
  completedCourses: buildSeedCourses("Computer Science"),
  gpa: 3.78,
  gpaPublic: true,
  residency: "texas",
  financialNeed: "medium",
  resumeSummary:
    "Computer Science student with Python, TypeScript, and ML project experience interested in research, internships, and product-building.",
  skills: ["python", "typescript", "pytorch", "sql", "git"],
  interests: ["machine learning", "education", "student tools", "product design"],
  careerGoal: "research",
  preferredLocations: [],
  preferredTerms: [],
  clubInterests: ["ai", "entrepreneurship", "community service"],
  hoursPerWeek: 5,
  transcriptFileName: "alex-rivera-transcript.pdf",
  resumeFileName: "alex-rivera-resume.pdf",
  transcriptUploadStatus: "reviewed",
  resumeUploadStatus: "reviewed",
  authStatus: "demo",
  accountMode: "fallback",
});

interface ProfileContextValue {
  profile: StudentProfile | null;
  setProfile: (profile: StudentProfile) => Promise<void>;
  clearProfile: () => Promise<void>;
  signIn: (input: SignInInput) => Promise<{ error?: string }>;
  signUp: (
    input: AuthInput,
    profile: StudentProfile,
  ) => Promise<{ error?: string; requiresVerification?: boolean }>;
  loadDemoProfile: () => Promise<void>;
  authStatus: AuthStatus;
  authEmail: string | null;
  persistenceMode: ProfilePersistenceMode;
  isSupabaseReady: boolean;
  isHydrated: boolean;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: PropsWithChildren) {
  const [profile, setProfileState] = useState<StudentProfile | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("signed_out");
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [persistenceMode, setPersistenceMode] =
    useState<ProfilePersistenceMode>("fallback");
  const [isHydrated, setIsHydrated] = useState(false);
  const supabaseReady = isSupabaseConfigured();

  async function loadSupabaseProfile(userId: string, email: string | null) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return null;
    }

    const [profileResult, settingsResult] = await Promise.all([
      supabase.from("student_profiles").select("*").eq("auth_user_id", userId).maybeSingle(),
      supabase
        .from("profile_settings")
        .select("gpa_public,auth_status,account_mode")
        .eq("auth_user_id", userId)
        .maybeSingle(),
    ]);

    if (profileResult.data) {
      return fromSupabaseRows(
        profileResult.data as ProfileRow,
        (settingsResult.data as ProfileSettingsRow | null) ?? null,
      );
    }

    const draftProfile = readJson<StudentProfile>(FALLBACK_DRAFT_KEY);
    if (draftProfile && draftProfile.authUserId === userId) {
      return normalizeProfile({
        ...draftProfile,
        email: email ?? draftProfile.email,
        authStatus: "authenticated",
        accountMode: "supabase",
      });
    }

    return null;
  }

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | undefined;

    async function hydrate() {
      try {
        const supabase = getSupabaseBrowserClient();

        if (supabase) {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!isActive) {
            return;
          }

          if (session?.user) {
            const hydratedProfile = await loadSupabaseProfile(
              session.user.id,
              session.user.email ?? null,
            );

            if (!isActive) {
              return;
            }

            setProfileState(hydratedProfile);
            setAuthEmail(session.user.email ?? null);
            setAuthStatus(
              session.user.email_confirmed_at ? "authenticated" : "pending_verification",
            );
            setPersistenceMode("supabase");
          } else {
            const storedProfile = readJson<StudentProfile>(PROFILE_STORAGE_KEY);
            const storedAuth = readJson<FallbackAuthRecord>(FALLBACK_AUTH_KEY);
            setProfileState(storedProfile ? normalizeProfile(storedProfile) : null);
            setAuthEmail(storedAuth?.email ?? storedProfile?.email ?? null);
            setAuthStatus(
              storedProfile?.authStatus ?? (storedAuth ? "authenticated" : "signed_out"),
            );
            setPersistenceMode("fallback");
          }

          const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (!isActive) {
              return;
            }

            if (!nextSession?.user) {
              setProfileState(null);
              setAuthEmail(null);
              setAuthStatus("signed_out");
              setPersistenceMode("fallback");
              return;
            }

            setAuthEmail(nextSession.user.email ?? null);
            setAuthStatus(
              nextSession.user.email_confirmed_at ? "authenticated" : "pending_verification",
            );
            setPersistenceMode("supabase");

            void loadSupabaseProfile(
              nextSession.user.id,
              nextSession.user.email ?? null,
            ).then((nextProfile) => {
              if (isActive) {
                setProfileState(nextProfile);
              }
            });
          });

          unsubscribe = () => {
            data.subscription.unsubscribe();
          };

          return;
        }

        const storedProfile = readJson<StudentProfile>(PROFILE_STORAGE_KEY);
        const storedAuth = readJson<FallbackAuthRecord>(FALLBACK_AUTH_KEY);
        setProfileState(storedProfile ? normalizeProfile(storedProfile) : null);
        setAuthEmail(storedAuth?.email ?? storedProfile?.email ?? null);
        setAuthStatus(
          storedProfile?.authStatus ??
            (storedAuth ? (storedAuth.verified ? "authenticated" : "pending_verification") : "signed_out"),
        );
        setPersistenceMode("fallback");
      } finally {
        if (isActive) {
          setIsHydrated(true);
        }
      }
    }

    void hydrate();

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, []);

  const persistFallbackProfile = (nextProfile: StudentProfile) => {
    const normalized = normalizeProfile({
      ...nextProfile,
      accountMode: "fallback",
    });
    setProfileState(normalized);
    setAuthEmail(normalized.email);
    setAuthStatus(normalized.authStatus ?? "authenticated");
    setPersistenceMode("fallback");
    writeJson(PROFILE_STORAGE_KEY, normalized);
  };

  const setProfile = async (nextProfile: StudentProfile) => {
    const normalized = normalizeProfile(nextProfile);
    const supabase = getSupabaseBrowserClient();

    if (supabase) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const nextAuthStatus = session.user.email_confirmed_at
          ? "authenticated"
          : "pending_verification";

        await Promise.all([
          supabase.from("student_profiles").upsert(toSupabaseProfileRow(normalized, session.user.id), {
            onConflict: "auth_user_id",
          }),
          supabase.from("profile_settings").upsert(
            {
              auth_user_id: session.user.id,
              gpa_public: normalized.gpaPublic,
              auth_status: nextAuthStatus,
              account_mode: "supabase",
            },
            { onConflict: "auth_user_id" },
          ),
        ]);

        const updatedProfile = normalizeProfile({
          ...normalized,
          authUserId: session.user.id,
          authStatus: nextAuthStatus,
          accountMode: "supabase",
        });

        setProfileState(updatedProfile);
        setAuthEmail(updatedProfile.email);
        setAuthStatus(nextAuthStatus);
        setPersistenceMode("supabase");
        writeJson(PROFILE_STORAGE_KEY, updatedProfile);
        writeJson(FALLBACK_DRAFT_KEY, updatedProfile);
        return;
      }
    }

    persistFallbackProfile(normalized);
  };

  const signIn = async ({ email, password }: SignInInput) => {
    if (!isUtEmail(email)) {
      return { error: "Use your @utexas.edu email for Hook accounts." };
    }

    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: error.message };
      }

      const nextProfile = data.user
        ? await loadSupabaseProfile(data.user.id, data.user.email ?? email)
        : null;

      setProfileState(nextProfile);
      setAuthEmail(data.user?.email ?? email);
      setAuthStatus(data.user?.email_confirmed_at ? "authenticated" : "pending_verification");
      setPersistenceMode("supabase");
      return {};
    }

    const storedAuth = readJson<FallbackAuthRecord>(FALLBACK_AUTH_KEY);
    const storedProfile = readJson<StudentProfile>(PROFILE_STORAGE_KEY);

    if (!storedAuth || storedAuth.email !== email || storedAuth.password !== password) {
      return { error: "No matching fallback account was found for that email/password." };
    }

    if (storedProfile) {
      const normalized = normalizeProfile({
        ...storedProfile,
        authStatus: storedAuth.verified ? "authenticated" : "pending_verification",
        accountMode: "fallback",
      });
      setProfileState(normalized);
      writeJson(PROFILE_STORAGE_KEY, normalized);
    }

    setAuthEmail(email);
    setAuthStatus(storedAuth.verified ? "authenticated" : "pending_verification");
    setPersistenceMode("fallback");
    return {};
  };

  const signUp = async (input: AuthInput, nextProfile: StudentProfile) => {
    if (!isUtEmail(input.email)) {
      return { error: "Use your @utexas.edu email for Hook accounts." };
    }

    const normalized = normalizeProfile({
      ...nextProfile,
      email: input.email,
      utEid: input.utEid,
      name: input.fullName,
    });

    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            full_name: input.fullName,
            ut_eid: input.utEid,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      const requiresVerification = !data.session;
      const profileToStore = normalizeProfile({
        ...normalized,
        authUserId: data.user?.id ?? null,
        authStatus: requiresVerification ? "pending_verification" : "authenticated",
        accountMode: data.session ? "supabase" : "fallback",
      });

      if (data.session?.user) {
        await setProfile(profileToStore);
      } else {
        writeJson(FALLBACK_DRAFT_KEY, profileToStore);
        persistFallbackProfile(profileToStore);
      }

      setAuthEmail(input.email);
      setAuthStatus(requiresVerification ? "pending_verification" : "authenticated");
      return { requiresVerification };
    }

    const fallbackAuth: FallbackAuthRecord = {
      email: input.email,
      password: input.password,
      fullName: input.fullName,
      utEid: input.utEid,
      verified: true,
    };

    writeJson(FALLBACK_AUTH_KEY, fallbackAuth);
    persistFallbackProfile(
      normalizeProfile({
        ...normalized,
        authStatus: "authenticated",
        accountMode: "fallback",
      }),
    );
    return {};
  };

  const loadDemoProfile = async () => {
    persistFallbackProfile(DEMO_PROFILE);
    setAuthStatus("demo");
  };

  const clearProfile = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }

    setProfileState(null);
    setAuthEmail(null);
    setAuthStatus("signed_out");
    setPersistenceMode("fallback");
    clearFallbackStorage();
  };

  const value = useMemo(
    () => ({
      profile,
      setProfile,
      clearProfile,
      signIn,
      signUp,
      loadDemoProfile,
      authStatus,
      authEmail,
      persistenceMode,
      isSupabaseReady: supabaseReady,
      isHydrated,
    }),
    [profile, authStatus, authEmail, persistenceMode, supabaseReady, isHydrated],
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
