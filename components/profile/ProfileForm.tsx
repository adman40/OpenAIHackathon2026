"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import {
  fileToDataUrl,
  parseResumeFile,
  parseTranscriptFile,
} from "../../lib/onboarding-parsers";
import { MAJOR_OPTIONS } from "../../lib/profile-utils";
import type {
  CareerGoal,
  FinancialNeed,
  Residency,
  StudentProfile,
} from "../../lib/types";

interface CreateAccountPayload {
  email: string;
  password: string;
  fullName: string;
  utEid: string;
  profile: StudentProfile;
}

interface ProfileFormProps {
  onCreateAccount: (
    payload: CreateAccountPayload,
  ) => Promise<{ error?: string; requiresVerification?: boolean }>;
  onSignIn: (payload: { email: string; password: string }) => Promise<{ error?: string }>;
}

interface FormState {
  email: string;
  password: string;
  fullName: string;
  utEid: string;
  major: string;
  currentSemester: string;
  completedCourses: StudentProfile["completedCourses"];
  gpa: string;
  gpaPublic: boolean;
  residency: Residency;
  financialNeed: FinancialNeed;
  resumeSummary: string;
  skills: string[];
  interests: string[];
  careerGoal: CareerGoal;
  preferredLocations: string[];
  preferredTerms: string[];
  clubInterests: string[];
  hoursPerWeek: number;
  transcriptFileName: string | null;
  resumeFileName: string | null;
  transcriptUploadStatus: NonNullable<StudentProfile["transcriptUploadStatus"]>;
  resumeUploadStatus: NonNullable<StudentProfile["resumeUploadStatus"]>;
  profilePhotoUrl: string | null;
}

const TOTAL_STEPS = 4;
const residencyOptions: Residency[] = ["texas", "out-of-state", "international"];
const financialNeedOptions: FinancialNeed[] = ["low", "medium", "high"];
const careerGoalOptions: CareerGoal[] = ["industry", "research", "grad_school", "undecided"];
const locationOptions = ["Austin", "Remote", "Dallas", "Houston", "San Francisco", "New York"];
const termOptions = ["spring", "summer", "fall"];

const initialState: FormState = {
  email: "",
  password: "",
  fullName: "",
  utEid: "",
  major: "Computer Science",
  currentSemester: "Spring 2026",
  completedCourses: [],
  gpa: "",
  gpaPublic: true,
  residency: "texas",
  financialNeed: "medium",
  resumeSummary: "",
  skills: [],
  interests: [],
  careerGoal: "undecided",
  preferredLocations: ["Austin", "Remote"],
  preferredTerms: ["summer", "fall"],
  clubInterests: [],
  hoursPerWeek: 5,
  transcriptFileName: null,
  resumeFileName: null,
  transcriptUploadStatus: "missing",
  resumeUploadStatus: "missing",
  profilePhotoUrl: null,
};

function pillClasses(selected: boolean) {
  return selected
    ? "border-orange-700 bg-orange-700 text-white"
    : "border-stone-300 bg-white text-stone-700 hover:border-orange-400";
}

export default function ProfileForm({ onCreateAccount, onSignIn }: ProfileFormProps) {
  const [mode, setMode] = useState<"create" | "sign_in">("create");
  const [step, setStep] = useState(1);
  const [formState, setFormState] = useState<FormState>(initialState);
  const [skillDraft, setSkillDraft] = useState("");
  const [interestDraft, setInterestDraft] = useState("");
  const [clubDraft, setClubDraft] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const progress = (step / TOTAL_STEPS) * 100;

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState((current) => ({ ...current, [key]: value }));
  };

  const toggleListItem = (key: "preferredLocations" | "preferredTerms", value: string) => {
    setFormState((current) => {
      const currentValues = current[key];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      return { ...current, [key]: nextValues };
    });
  };

  const addTextTag = (key: "skills" | "interests" | "clubInterests", rawValue: string) => {
    const value = rawValue.trim();
    if (!value) return;

    setFormState((current) => {
      if (current[key].some((item) => item.toLowerCase() === value.toLowerCase())) {
        return current;
      }

      return { ...current, [key]: [...current[key], value] };
    });
  };

  const removeTextTag = (key: "skills" | "interests" | "clubInterests", value: string) => {
    setFormState((current) => ({
      ...current,
      [key]: current[key].filter((item) => item !== value),
    }));
  };

  const removeCompletedCourse = (courseId: string) => {
    setFormState((current) => ({
      ...current,
      completedCourses: current.completedCourses.filter((course) => course.courseId !== courseId),
    }));
  };

  const onTagKeyDown =
    (
      key: "skills" | "interests" | "clubInterests",
      value: string,
      clear: () => void,
    ) =>
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" || event.key === ",") {
        event.preventDefault();
        addTextTag(key, value);
        clear();
      }
    };

  const validateCurrentStep = () => {
    const nextErrors: string[] = [];

    if (mode === "sign_in") {
      if (!formState.email.trim()) nextErrors.push("Add your UT email.");
      if (!formState.password.trim()) nextErrors.push("Add your password.");
      setErrors(nextErrors);
      return nextErrors.length === 0;
    }

    if (step === 1) {
      if (!formState.fullName.trim()) nextErrors.push("Add your full name.");
      if (!formState.email.trim()) nextErrors.push("Add your UT email.");
      if (!formState.password.trim()) nextErrors.push("Add a password.");
      if (!formState.utEid.trim()) nextErrors.push("Add your UT EID.");
    }

    if (step === 2) {
      if (!formState.major.trim()) nextErrors.push("Choose a major.");
      if (!formState.currentSemester.trim()) nextErrors.push("Add your current semester.");
      if (formState.gpa.trim().length > 0) {
        const gpa = Number(formState.gpa);
        if (Number.isNaN(gpa) || gpa < 0 || gpa > 4) {
          nextErrors.push("GPA must be between 0.0 and 4.0.");
        }
      }
    }

    if (step === 3) {
      if (formState.completedCourses.length === 0) {
        nextErrors.push("Upload a transcript or keep the seeded transcript fallback.");
      }
      if (!formState.resumeSummary.trim()) {
        nextErrors.push("Upload a resume or keep the seeded resume summary.");
      }
    }

    if (step === 4) {
      if (formState.preferredLocations.length === 0) {
        nextErrors.push("Choose at least one preferred location.");
      }
      if (formState.preferredTerms.length === 0) {
        nextErrors.push("Choose at least one preferred term.");
      }
      if (formState.skills.length === 0) nextErrors.push("Add at least one skill.");
      if (formState.interests.length === 0) nextErrors.push("Add at least one interest.");
      if (formState.clubInterests.length === 0) {
        nextErrors.push("Add at least one club or community interest.");
      }
    }

    setErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const handleNext = () => {
    setInfoMessage(null);
    if (!validateCurrentStep()) return;
    setStep((current) => Math.min(TOTAL_STEPS, current + 1));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInfoMessage(null);
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);

    if (mode === "sign_in") {
      const result = await onSignIn({
        email: formState.email.trim(),
        password: formState.password,
      });
      setIsSubmitting(false);
      setErrors(result.error ? [result.error] : []);
      return;
    }

    const profile: StudentProfile = {
      email: formState.email.trim(),
      utEid: formState.utEid.trim(),
      name: formState.fullName.trim(),
      major: formState.major,
      currentSemester: formState.currentSemester,
      completedCourses: formState.completedCourses,
      gpa: formState.gpa.trim() ? Number(formState.gpa) : null,
      gpaPublic: formState.gpaPublic,
      residency: formState.residency,
      financialNeed: formState.financialNeed,
      resumeSummary: formState.resumeSummary,
      skills: formState.skills,
      interests: formState.interests,
      careerGoal: formState.careerGoal,
      preferredLocations: formState.preferredLocations,
      preferredTerms: formState.preferredTerms,
      clubInterests: formState.clubInterests,
      hoursPerWeek: formState.hoursPerWeek,
      profilePhotoUrl: formState.profilePhotoUrl,
      transcriptFileName: formState.transcriptFileName,
      resumeFileName: formState.resumeFileName,
      transcriptUploadStatus: formState.transcriptUploadStatus,
      resumeUploadStatus: formState.resumeUploadStatus,
      accountMode: "fallback",
      authStatus: "authenticated",
    };

    const result = await onCreateAccount({
      email: profile.email,
      password: formState.password,
      fullName: profile.name,
      utEid: profile.utEid,
      profile,
    });

    setIsSubmitting(false);
    setErrors(result.error ? [result.error] : []);
    setInfoMessage(
      result.requiresVerification
        ? "Verification email sent. Hook will keep your draft profile ready while the account is pending verification."
        : null,
    );
  };

  const renderCreateStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">Full name</label>
              <input
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
                value={formState.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                placeholder="Avery Longhorn"
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">UT email</label>
                <input
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
                  value={formState.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="you@utexas.edu"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">Password</label>
                <input
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
                  type="password"
                  value={formState.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">UT EID</label>
              <input
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
                value={formState.utEid}
                onChange={(event) => updateField("utEid", event.target.value)}
                placeholder="e.g. abc1234"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">Major</label>
                <select
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
                  value={formState.major}
                  onChange={(event) => updateField("major", event.target.value)}
                >
                  {MAJOR_OPTIONS.map((major) => (
                    <option key={major} value={major}>
                      {major}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Current semester
                </label>
                <input
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
                  value={formState.currentSemester}
                  onChange={(event) => updateField("currentSemester", event.target.value)}
                  placeholder="Spring 2026"
                />
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Numeric GPA
                </label>
                <input
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
                  value={formState.gpa}
                  onChange={(event) => updateField("gpa", event.target.value)}
                  type="number"
                  min="0"
                  max="4"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Auto-filled after transcript upload"
                />
              </div>
              <div>
                <span className="mb-2 block text-sm font-medium text-stone-700">
                  GPA Visibility
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updateField("gpaPublic", true)}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium ${pillClasses(
                      formState.gpaPublic,
                    )}`}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField("gpaPublic", false)}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium ${pillClasses(
                      !formState.gpaPublic,
                    )}`}
                  >
                    Hidden
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Weekly availability
                </label>
                <input
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
                  type="number"
                  min={1}
                  max={20}
                  value={formState.hoursPerWeek}
                  onChange={(event) => updateField("hoursPerWeek", Number(event.target.value))}
                />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Transcript upload
                </label>
                <input
                  className="block w-full text-sm text-stone-700"
                  type="file"
                  accept=".pdf,.txt,.md,.csv,.json"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const parsed = await parseTranscriptFile(file, formState.major);
                    updateField("completedCourses", parsed.courses);
                    updateField("gpa", parsed.gpa?.toFixed(2) ?? "");
                    updateField("transcriptFileName", file.name);
                    updateField(
                      "transcriptUploadStatus",
                      parsed.usedFallback ? "uploaded" : "reviewed",
                    );
                    setInfoMessage(
                      parsed.usedFallback
                        ? "Transcript uploaded. Hook used a major-based fallback because the browser-only parser could not extract structured text from that file yet."
                        : "Transcript uploaded and parsed into completed courses for the demo profile.",
                    );
                  }}
                />
                <p className="mt-2 text-xs text-stone-500">
                  Browser-safe fallback keeps PDF uploads demoable even before server-side parsing
                  lands.
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Resume upload
                </label>
                <input
                  className="block w-full text-sm text-stone-700"
                  type="file"
                  accept=".pdf,.txt,.md,.doc,.docx,.json"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const parsed = await parseResumeFile(file, formState.major);
                    updateField("resumeFileName", file.name);
                    updateField("resumeSummary", parsed.summary);
                    updateField("skills", parsed.skills);
                    updateField(
                      "resumeUploadStatus",
                      parsed.usedFallback ? "uploaded" : "reviewed",
                    );
                    setInfoMessage(
                      parsed.usedFallback
                        ? "Resume uploaded. Hook seeded editable skills because the selected file was not text-readable in the browser-only parser."
                        : "Resume uploaded and converted into an editable skill draft.",
                    );
                  }}
                />
                <p className="mt-2 text-xs text-stone-500">
                  Skills remain editable after parsing so the demo can show human review.
                </p>
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <span className="mb-2 block text-sm font-medium text-stone-700">Residency</span>
                <div className="space-y-2">
                  {residencyOptions.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm text-stone-700">
                      <input
                        type="radio"
                        name="residency"
                        checked={formState.residency === option}
                        onChange={() => updateField("residency", option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <span className="mb-2 block text-sm font-medium text-stone-700">
                  Financial Need
                </span>
                <div className="space-y-2">
                  {financialNeedOptions.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm text-stone-700">
                      <input
                        type="radio"
                        name="financialNeed"
                        checked={formState.financialNeed === option}
                        onChange={() => updateField("financialNeed", option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">
                Optional profile photo
              </label>
              <input
                className="block w-full text-sm text-stone-700"
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const photoUrl = await fileToDataUrl(file);
                  updateField("profilePhotoUrl", photoUrl);
                }}
              />
              {formState.profilePhotoUrl ? (
                <img
                  alt="Profile preview"
                  className="mt-3 h-20 w-20 rounded-2xl object-cover"
                  src={formState.profilePhotoUrl}
                />
              ) : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">
                Resume summary
              </label>
              <textarea
                className="min-h-[120px] w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
                value={formState.resumeSummary}
                onChange={(event) => updateField("resumeSummary", event.target.value)}
                placeholder="Parsed from resume upload, but editable before the profile is saved."
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-stone-700">Parsed course preview</p>
              <div className="flex flex-wrap gap-2">
                {formState.completedCourses.map((course) => (
                  <button
                    key={course.courseId}
                    type="button"
                    onClick={() => removeCompletedCourse(course.courseId)}
                    className="rounded-full bg-stone-100 px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-200"
                  >
                    {course.courseId} ({course.grade}) x
                  </button>
                ))}
                {formState.completedCourses.length === 0 ? (
                  <p className="text-sm text-stone-500">Upload a transcript to populate this list.</p>
                ) : null}
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-5">
            <div>
              <span className="mb-2 block text-sm font-medium text-stone-700">Career goal</span>
              <div className="grid gap-3 md:grid-cols-2">
                {careerGoalOptions.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => updateField("careerGoal", goal)}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium ${pillClasses(
                      formState.careerGoal === goal,
                    )}`}
                  >
                    {goal.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-2 block text-sm font-medium text-stone-700">
                Preferred locations
              </span>
              <div className="flex flex-wrap gap-2">
                {locationOptions.map((location) => (
                  <button
                    key={location}
                    type="button"
                    onClick={() => toggleListItem("preferredLocations", location)}
                    className={`rounded-full border px-3 py-2 text-sm font-medium ${pillClasses(
                      formState.preferredLocations.includes(location),
                    )}`}
                  >
                    {location}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-2 block text-sm font-medium text-stone-700">
                Preferred terms
              </span>
              <div className="flex flex-wrap gap-2">
                {termOptions.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => toggleListItem("preferredTerms", term)}
                    className={`rounded-full border px-3 py-2 text-sm font-medium ${pillClasses(
                      formState.preferredTerms.includes(term),
                    )}`}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">Skills</label>
              <input
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
                value={skillDraft}
                onChange={(event) => setSkillDraft(event.target.value)}
                onKeyDown={onTagKeyDown("skills", skillDraft, () => setSkillDraft(""))}
                placeholder="Resume parsing pre-fills this. Add or remove skills before saving."
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {formState.skills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => removeTextTag("skills", skill)}
                    className="rounded-full bg-stone-100 px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-200"
                  >
                    {skill} x
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">Interests</label>
              <input
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
                value={interestDraft}
                onChange={(event) => setInterestDraft(event.target.value)}
                onKeyDown={onTagKeyDown("interests", interestDraft, () => setInterestDraft(""))}
                placeholder="What should Hook optimize for beyond the transcript and resume?"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {formState.interests.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => removeTextTag("interests", interest)}
                    className="rounded-full bg-stone-100 px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-200"
                  >
                    {interest} x
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">
                Club / Community Interests
              </label>
              <input
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
                value={clubDraft}
                onChange={(event) => setClubDraft(event.target.value)}
                onKeyDown={onTagKeyDown("clubInterests", clubDraft, () => setClubDraft(""))}
                placeholder="Examples: entrepreneurship, robotics, service, pre-med"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {formState.clubInterests.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => removeTextTag("clubInterests", interest)}
                    className="rounded-full bg-stone-100 px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-200"
                  >
                    {interest} x
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (mode === "sign_in") {
    return (
      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm md:p-8"
      >
        <div className="mb-6 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setMode("create");
              setErrors([]);
              setInfoMessage(null);
              setStep(1);
            }}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700"
          >
            Create account
          </button>
          <button
            type="button"
            className="rounded-full bg-orange-700 px-4 py-2 text-sm font-medium text-white"
          >
            Sign in
          </button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700">UT email</label>
            <input
              className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
              value={formState.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="you@utexas.edu"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700">Password</label>
            <input
              className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
              type="password"
              value={formState.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="Your existing Hook password"
            />
          </div>
        </div>

        {errors.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <ul className="list-disc pl-5">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-orange-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-800 disabled:opacity-50"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm md:p-8"
    >
      <div className="mb-6 flex gap-3">
        <button
          type="button"
          className="rounded-full bg-orange-700 px-4 py-2 text-sm font-medium text-white"
        >
          Create account
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("sign_in");
            setErrors([]);
            setInfoMessage(null);
          }}
          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700"
        >
          Sign in
        </button>
      </div>

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm text-stone-500">
          <span>
            Step {step} of {TOTAL_STEPS}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-stone-200">
          <div
            className="h-2 rounded-full bg-orange-700 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-stone-900">Build your Hook account</h2>
        <p className="mt-2 text-sm text-stone-600">
          Hook now captures a durable student account, UT undergraduate major, transcript,
          resume, profile photo, GPA privacy, and opportunity preferences before it builds the
          dashboard.
        </p>
      </div>

      {renderCreateStep()}

      {infoMessage ? (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {infoMessage}
        </div>
      ) : null}

      {errors.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <ul className="list-disc pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setErrors([]);
            setInfoMessage(null);
            setStep((current) => Math.max(1, current - 1));
          }}
          className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={step === 1}
        >
          Back
        </button>

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={handleNext}
            className="rounded-xl bg-orange-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-800"
          >
            Continue
          </button>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-orange-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-800 disabled:opacity-50"
          >
            {isSubmitting ? "Saving account..." : "Build My Hook Dashboard"}
          </button>
        )}
      </div>
    </form>
  );
}
