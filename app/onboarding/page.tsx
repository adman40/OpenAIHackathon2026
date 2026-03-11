"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ProfileForm from "../../components/profile/ProfileForm";
import { useProfile } from "../../lib/profile-context";
import type { StudentProfile } from "../../lib/types";

export default function OnboardingPage() {
  const router = useRouter();
  const {
    profile,
    signIn,
    signUp,
    loadDemoProfile,
    isHydrated,
  } = useProfile();

  useEffect(() => {
    if (isHydrated && profile) {
      router.replace("/dashboard");
    }
  }, [isHydrated, profile, router]);

  const handleCreateAccount = async (payload: {
    email: string;
    password: string;
    fullName: string;
    utEid: string;
    profile: StudentProfile;
  }) => {
    const result = await signUp(
      {
        email: payload.email,
        password: payload.password,
        fullName: payload.fullName,
        utEid: payload.utEid,
      },
      payload.profile,
    );

    if (!result.error) {
      router.push("/dashboard");
    }

    return result;
  };

  const handleSignIn = async (payload: { email: string; password: string }) => {
    const result = await signIn(payload);
    if (!result.error) {
      router.push("/dashboard");
    }
    return result;
  };

  const handleDemoMode = async () => {
    await loadDemoProfile();
    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-4 py-10 text-stone-900 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[32px] bg-gradient-to-br from-orange-800 via-orange-700 to-amber-600 p-8 text-white shadow-lg md:p-10">
            <div className="mb-10 inline-flex rounded-full border border-white/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Hook
            </div>
            <h1 className="max-w-md text-4xl font-semibold leading-tight md:text-5xl">
              Productized onboarding for a real UT student profile.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-white/85 md:text-base">
              Engineer A&apos;s branch now starts with account identity, UT EID, transcript,
              resume, profile photo, and GPA privacy before the student lands on the dashboard.
            </p>
            <div className="mt-8 grid gap-3 text-sm text-white/90">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                Account setup requires UT email, password, and UT EID
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                Transcript and resume uploads seed completed courses, GPA, and skills
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void handleDemoMode();
              }}
              className="mt-8 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-orange-800 transition hover:bg-orange-50"
            >
              Try Demo Mode
            </button>
          </section>

          <section className="self-start">
            <ProfileForm onCreateAccount={handleCreateAccount} onSignIn={handleSignIn} />
          </section>
        </div>
      </div>
    </main>
  );
}
