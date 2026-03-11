import type {
  AcademicAnalysis,
  ClubMatch,
  OpportunityMatch,
  ScholarshipMatch,
} from "./types";

export const academicDemoFallback: AcademicAnalysis = {
  courseCatalogId: "cs-catalog",
  nextRegularTerm: "Fall 2026",
  percentComplete: 42,
  estimatedGraduationSemester: "Spring 2027",
  coreComplete: false,
  coreRecommendations: [
    {
      courseId: "GOV 312L",
      courseName: "Issues and Policies in American Government",
      requirementBucket: "core",
      urgency: "recommended",
      rationale: "Keeps core progress moving while your major sequence stays full.",
    },
    {
      courseId: "PHY 303K",
      courseName: "Engineering Physics I",
      requirementBucket: "core",
      urgency: "optional",
      rationale: "Opens more upper-division options if you want broader technical flexibility.",
    },
  ],
  majorRecommendations: [
    {
      courseId: "CS 331",
      courseName: "Algorithms and Complexity",
      requirementBucket: "major",
      urgency: "critical",
      rationale: "Completing CS 331 unlocks several upper-division CS electives next year.",
    },
    {
      courseId: "CS 329E",
      courseName: "Elements of Data Analytics",
      requirementBucket: "major",
      urgency: "recommended",
      rationale: "Aligns with your ML and product interests while adding a practical data course.",
    },
  ],
  eligibleCourses: [
    {
      courseId: "CS 331",
      courseName: "Algorithms and Complexity",
      requirementBucket: "major",
      credits: 3,
      prerequisites: ["CS 314", "CS 311"],
      termsOffered: ["Spring", "Fall"],
      professorName: "Dr. Shah",
      professorDifficulty: "Medium",
      gradeTendency: "Balanced",
      attendancePolicy: "Lecture attendance recommended",
    },
    {
      courseId: "CS 329E",
      courseName: "Elements of Data Analytics",
      requirementBucket: "major",
      credits: 3,
      prerequisites: ["CS 312", "M 408D"],
      termsOffered: ["Spring", "Fall"],
      professorName: "Dr. Patel",
      professorDifficulty: "Medium",
      gradeTendency: "Project-heavy",
      attendancePolicy: "Participation counts for 10%",
    },
  ],
  prereqAlerts: [
    "Take CS 331 soon. It is the main blocker for higher-level systems and AI electives in the current plan.",
  ],
  summary:
    "One prerequisite course now controls several stronger upper-division options in this plan.",
};

export const scholarshipsDemoFallback: { matches: ScholarshipMatch[] } = {
  matches: [
    {
      fitScore: 94,
      matchReasons: [
        "Strong GPA band for the award",
        "Computer Science major is explicitly favored",
        "Resume shows research and product-building interest",
      ],
      deadline: "2026-03-22",
      isUrgent: true,
      scholarship: {
        id: "ut-innovation-scholar",
        name: "UT Innovation Scholarship",
        amount: 5000,
        description: "Supports students building practical technology projects with campus impact.",
        eligibilitySignals: ["Computer Science", "3.5+ GPA", "project portfolio"],
        favoredQualities: ["technical initiative", "student impact", "leadership"],
        deadline: "2026-03-22",
        submissionDetails: "Submit a resume, transcript, and 500-word impact statement.",
        link: "https://example.edu/innovation-scholarship",
        importTimestamp: "2026-03-10T00:00:00.000Z",
      },
    },
    {
      fitScore: 88,
      matchReasons: [
        "Texas residency aligns with eligibility",
        "Financial need improves competitiveness",
        "Experience with student tools fits the mission",
      ],
      deadline: "2026-04-05",
      isUrgent: false,
      scholarship: {
        id: "hook-student-success-award",
        name: "Student Success Builder Award",
        amount: 3500,
        description: "Recognizes students creating tools or programs that improve campus life.",
        eligibilitySignals: ["Texas resident", "demonstrated campus impact"],
        favoredQualities: ["service", "product mindset", "execution"],
        deadline: "2026-04-05",
        submissionDetails: "Upload one recommendation and a short portfolio summary.",
        link: "https://example.edu/student-success-award",
        importTimestamp: "2026-03-10T00:00:00.000Z",
      },
    },
  ],
};

export const researchDemoFallback: { matches: OpportunityMatch[] } = {
  matches: [
    {
      fitScore: 91,
      matchReasons: [
        "Machine learning interest aligns directly",
        "Python and PyTorch experience match preferred skills",
        "Austin location fits your profile",
      ],
      opportunity: {
        id: "research-ml-learning-lab",
        kind: "research",
        title: "Undergraduate ML Learning Lab Assistant",
        organization: "Learning Systems Lab",
        location: "Austin",
        pay: "$18/hour",
        term: "summer",
        datePosted: "2026-03-01",
        applyBy: "2026-03-28",
        skills: ["python", "pytorch", "sql"],
        preferredMajors: ["Computer Science"],
        preferredCoursework: ["CS 314", "CS 329E"],
        description: "Support model experiments for student-learning tools and evaluation pipelines.",
        details: "Work with graduate mentors on weekly experiments and lightweight data analysis.",
      },
    },
    {
      fitScore: 84,
      matchReasons: [
        "Education and student-tools interests overlap",
        "TypeScript experience helps for dashboard tooling",
        "Remote-friendly schedule matches preferences",
      ],
      opportunity: {
        id: "research-edtech-studio",
        kind: "research",
        title: "EdTech Product Research Assistant",
        organization: "Campus Innovation Studio",
        location: "Remote",
        pay: "$16/hour",
        term: "fall",
        datePosted: "2026-02-24",
        applyBy: "2026-04-10",
        skills: ["typescript", "sql", "product design"],
        preferredMajors: ["Computer Science", "Informatics"],
        preferredCoursework: ["CS 312"],
        description: "Prototype and evaluate software concepts for student support workflows.",
        details: "Blend user research, light frontend work, and synthesis for campus pilots.",
      },
    },
  ],
};

export const internshipsDemoFallback: { matches: OpportunityMatch[] } = {
  matches: [
    {
      fitScore: 93,
      matchReasons: [
        "Product-building resume aligns with the role",
        "TypeScript and SQL are direct skill matches",
        "Remote preference and summer term both align",
      ],
      opportunity: {
        id: "intern-student-platforms",
        kind: "internship",
        title: "Student Platforms Software Intern",
        organization: "Longhorn Digital",
        location: "Remote",
        pay: "$32/hour",
        term: "summer",
        datePosted: "2026-03-03",
        applyBy: "2026-03-25",
        skills: ["typescript", "sql", "git"],
        preferredMajors: ["Computer Science"],
        preferredCoursework: ["CS 312", "CS 314"],
        description: "Build internal tools that improve advising and student operations.",
        details: "Focus on full-stack features, analytics, and product-quality execution.",
      },
    },
    {
      fitScore: 86,
      matchReasons: [
        "Austin location preference matches",
        "Research-oriented career goal fits experimentation work",
        "Python experience is relevant",
      ],
      opportunity: {
        id: "intern-ai-operations",
        kind: "internship",
        title: "AI Operations Intern",
        organization: "Austin Civic Tech",
        location: "Austin",
        pay: "$28/hour",
        term: "fall",
        datePosted: "2026-02-27",
        applyBy: "2026-04-08",
        skills: ["python", "sql", "git"],
        preferredMajors: ["Computer Science", "Data Science"],
        preferredCoursework: ["CS 314", "M 408D"],
        description: "Improve internal AI workflows for public-interest service teams.",
        details: "Blend scripting, analytics, and experimentation with a small product team.",
      },
    },
  ],
};

export const clubsDemoFallback: ClubMatch[] = [
  {
    fitScore: 90,
    matchReasons: [
      "AI interest aligns directly",
      "Meets weekly without heavy overload",
      "Good match for research-oriented students",
    ],
    timeCommitment: "2-3 hours/week",
    meetingCadence: "Weekly",
    club: {
      id: "club-ai-builders",
      name: "AI Builders Society",
      category: "Professional",
      description: "Project-based community for students building ML and applied AI products.",
      interestTags: ["ai", "machine learning", "product"],
      majors: ["Computer Science", "ECE"],
      careers: ["research", "industry"],
      timeCommitment: "2-3 hours/week",
      meetingCadence: "Weekly",
      joinLink: "https://example.edu/ai-builders",
    },
  },
  {
    fitScore: 82,
    matchReasons: [
      "Entrepreneurship interest overlaps",
      "Product design interest fits the community",
      "Low-friction commitment makes it easy to try",
    ],
    timeCommitment: "1-2 hours/week",
    meetingCadence: "Biweekly",
    club: {
      id: "club-campus-founders",
      name: "Campus Founders Forum",
      category: "Entrepreneurship",
      description: "Peer group for students exploring startup ideas and practical product launches.",
      interestTags: ["entrepreneurship", "product design", "student tools"],
      majors: ["Computer Science", "Business Administration"],
      careers: ["industry", "undecided"],
      timeCommitment: "1-2 hours/week",
      meetingCadence: "Biweekly",
      joinLink: "https://example.edu/campus-founders",
    },
  },
];
