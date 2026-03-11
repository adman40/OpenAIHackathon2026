"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import type {
  CareerGoal,
  CompletedCourse,
  FinancialNeed,
  Residency,
  StudentProfile,
} from "../../lib/types";

interface ProfileFormProps {
  onComplete: (profile: StudentProfile) => void;
}

interface FormState {
  name: string;
  major: string;
  currentSemester: string;
  completedCourses: CompletedCourse[];
  gpaRange: string;
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
}

const TOTAL_STEPS = 4;

const majors = [
  "Computer Science",
  "Electrical and Computer Engineering",
  "Business Administration",
  "Biology",
  "Mathematics",
  "Psychology",
];

const gpaRanges = ["2.0-2.5", "2.5-3.0", "3.0-3.5", "3.5-4.0"];
const residencyOptions: Residency[] = ["texas", "out-of-state", "international"];
const financialNeedOptions: FinancialNeed[] = ["low", "medium", "high"];
const careerGoals: CareerGoal[] = ["industry", "research", "grad_school", "undecided"];
const initialState: FormState = {
  name: "",
  major: "Computer Science",
  currentSemester: "Spring 2026",
  completedCourses: [],
  gpaRange: "3.5-4.0",
  gpaPublic: true,
  residency: "texas",
  financialNeed: "medium",
  resumeSummary: "",
  skills: [],
  interests: [],
  careerGoal: "research",
  preferredLocations: [],
  preferredTerms: [],
  clubInterests: [],
};

function pillClasses(selected: boolean) {
  return selected
    ? "border-orange-700 bg-orange-700 text-white"
    : "border-stone-300 bg-white text-stone-700 hover:border-orange-400";
}

export default function ProfileForm({ onComplete }: ProfileFormProps) {
  const [step, setStep] = useState(1);
  const [formState, setFormState] = useState<FormState>(initialState);
  const [courseDraft, setCourseDraft] = useState("");
  const [courseGradeDraft, setCourseGradeDraft] = useState("A");
  const [skillDraft, setSkillDraft] = useState("");
  const [interestDraft, setInterestDraft] = useState("");
  const [clubDraft, setClubDraft] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const progress = (step / TOTAL_STEPS) * 100;

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState((current) => ({ ...current, [key]: value }));
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

  const addCompletedCourse = () => {
    const courseId = courseDraft.trim().toUpperCase();
    if (!courseId) return;

    setFormState((current) => {
      if (current.completedCourses.some((course) => course.courseId === courseId)) {
        return current;
      }

      return {
        ...current,
        completedCourses: [...current.completedCourses, { courseId, grade: courseGradeDraft }],
      };
    });

    setCourseDraft("");
    setCourseGradeDraft("A");
  };

  const removeCompletedCourse = (courseId: string) => {
    setFormState((current) => ({
      ...current,
      completedCourses: current.completedCourses.filter((course) => course.courseId !== courseId),
    }));
  };

  const onCourseKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addCompletedCourse();
    }
  };

  const onTagKeyDown =
    (
      key: "skills" | "interests" | "clubInterests",
      value: string,
      clear: () => void
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

    if (step === 1) {
      if (!formState.name.trim()) nextErrors.push("Add a name.");
      if (!formState.major.trim()) nextErrors.push("Choose a major.");
      if (!formState.currentSemester.trim()) nextErrors.push("Add the current semester.");
    }

    if (step === 2) {
      if (formState.completedCourses.length === 0) {
        nextErrors.push("Add at least one completed course for the demo.");
      }
      if (!formState.gpaRange.trim()) nextErrors.push("Choose a GPA range.");
    }

    if (step === 3) {
      if (!formState.resumeSummary.trim()) nextErrors.push("Add a short resume summary.");
    }

    if (step === 4) {
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
    if (!validateCurrentStep()) return;
    setStep((current) => Math.min(TOTAL_STEPS, current + 1));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateCurrentStep()) return;
    onComplete(formState);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">Name</label>
              <input
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
                value={formState.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Alex Rivera"
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">Major</label>
                <select
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
                  value={formState.major}
                  onChange={(event) => updateField("major", event.target.value)}
                >
                  {majors.map((major) => (
                    <option key={major} value={major}>
                      {major}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Current Semester
                </label>
                <input
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
                  value={formState.currentSemester}
                  onChange={(event) => updateField("currentSemester", event.target.value)}
                  placeholder="Spring 2026"
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-[1fr_120px_120px]">
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Completed Course
                </label>
                <input
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
                  value={courseDraft}
                  onChange={(event) => setCourseDraft(event.target.value)}
                  onKeyDown={onCourseKeyDown}
                  placeholder="CS 314"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">Grade</label>
                <select
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
                  value={courseGradeDraft}
                  onChange={(event) => setCourseGradeDraft(event.target.value)}
                >
                  {["A", "A-", "B+", "B", "B-", "C+", "C", "C-"].map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addCompletedCourse}
                  className="w-full rounded-xl border border-orange-700 px-4 py-3 font-semibold text-orange-700 transition hover:bg-orange-50"
                >
                  Add Course
                </button>
              </div>
            </div>
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
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">GPA Range</label>
                <select
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
                  value={formState.gpaRange}
                  onChange={(event) => updateField("gpaRange", event.target.value)}
                >
                  {gpaRanges.map((range) => (
                    <option key={range} value={range}>
                      {range}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="mb-2 block text-sm font-medium text-stone-700">GPA Visibility</span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updateField("gpaPublic", true)}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium ${pillClasses(
                      formState.gpaPublic
                    )}`}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField("gpaPublic", false)}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium ${pillClasses(
                      !formState.gpaPublic
                    )}`}
                  >
                    Hidden
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-3">
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
              <div>
                <span className="mb-2 block text-sm font-medium text-stone-700">Career Goal</span>
                <div className="space-y-2">
                  {careerGoals.map((goal) => (
                    <label key={goal} className="flex items-center gap-2 text-sm text-stone-700">
                      <input
                        type="radio"
                        name="careerGoal"
                        checked={formState.careerGoal === goal}
                        onChange={() => updateField("careerGoal", goal)}
                      />
                      {goal}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">
                Resume Summary
              </label>
              <textarea
                className="min-h-[120px] w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
                value={formState.resumeSummary}
                onChange={(event) => updateField("resumeSummary", event.target.value)}
                placeholder="Summarize your projects, leadership, technical skills, and what you want next."
              />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">Skills</label>
              <input
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none transition focus:border-orange-600"
                value={skillDraft}
                onChange={(event) => setSkillDraft(event.target.value)}
                onKeyDown={onTagKeyDown("skills", skillDraft, () => setSkillDraft(""))}
                placeholder="Type a skill and press Enter"
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
                placeholder="Type an interest and press Enter"
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
                placeholder="Type a community interest and press Enter"
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

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm md:p-8"
    >
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
        <h2 className="text-2xl font-semibold text-stone-900">Build your Hook profile</h2>
        <p className="mt-2 text-sm text-stone-600">
          This profile powers academic planning, scholarships, opportunities, clubs, and chat.
        </p>
      </div>

      {renderStep()}

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
            className="rounded-xl bg-orange-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-800"
          >
            Build My Hook Dashboard
          </button>
        )}
      </div>
    </form>
  );
}
