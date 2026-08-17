export type PlatformPolicy = {
  id: string;
  title: string;
  content: string;
  keywords: string[];
};

/** Public platform behaviours verified by the application. */
export const platformPolicies: PlatformPolicy[] = [
  {
    id: "enrollment",
    title: "Enrollment",
    content:
      "Students enroll in a course by entering the enrollment code provided for that course.",
    keywords: ["enroll", "enrollment", "join", "course code"],
  },
  {
    id: "submission-rules",
    title: "Submission Rules",
    content:
      "Students submit milestone work as supported HTTP(S) links, such as GitHub, Loom, deployment, or other approved external URLs.",
    keywords: ["submit", "submission", "milestone", "github", "loom", "link"],
  },
  {
    id: "grades",
    title: "Grades",
    content:
      "Students can view graded submissions and feedback from the Grades page.",
    keywords: ["grade", "grades", "feedback", "graded"],
  },
  {
    id: "account-roles",
    title: "Account Roles",
    content:
      "Students enroll in courses and submit milestone work. Instructors create and manage their own courses and review submissions.",
    keywords: ["role", "roles", "student", "instructor", "account"],
  },
];
