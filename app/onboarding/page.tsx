"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ProfileForm from "../../components/profile/ProfileForm";
import { DEMO_PROFILE, useProfile } from "../../lib/profile-context";
import type { StudentProfile } from "../../lib/types";

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, setProfile, isHydrated } = useProfile();

  useEffect(() => {
    if (isHydrated && profile) {
      router.replace("/dashboard");
    }
  }, [isHydrated, profile, router]);

  const handleComplete = (nextProfile: StudentProfile) => {
    setProfile(nextProfile);
    router.push("/dashboard");
  };

  const handleDemoMode = () => {
    setProfile(DEMO_PROFILE);
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
              College admin, organized around one student profile.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-white/85 md:text-base">
              Hook turns class planning, scholarships, research, internships, clubs, and
              campus-resource support into one coordinated dashboard. Start with your profile,
              then let Hook handle the administrative sprawl.
            </p>
            <div className="mt-8 grid gap-3 text-sm text-white/90">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                Academic planning with prerequisite warnings and next-semester recommendations
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                Fit-scored scholarships, research, internships, and club recommendations
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                Profile-aware chat for outreach drafts, study strategy, and campus support
              </div>
            </div>
            <button
              type="button"
              onClick={handleDemoMode}
              className="mt-8 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-orange-800 transition hover:bg-orange-50"
            >
              Try Demo Mode
            </button>
          </section>

          <section className="self-start">
            <ProfileForm onComplete={handleComplete} />
          </section>
        </div>
      </div>
    </main>
  );
}

