export interface PlatformPolicy {
  id: string;
  title: string;
  content: string;
}

export const platformPolicies: PlatformPolicy[] = [
  {
    id: "enrollment",
    title: "Enrollment",
    content:
      "Students enroll in available courses using the platform enrollment flow, typically via an enrollment code provided by the instructor.",
  },
  {
    id: "submission-rules",
    title: "Submission Rules",
    content:
      "Students submit milestone work using supported HTTP(S) links such as GitHub, Loom, or deployment (e.g. Vercel) links. Submissions move through Draft -> Submitted -> Graded.",
  },
  {
    id: "grades",
    title: "Grades",
    content:
      "Students can view their own graded submissions, scores, and instructor feedback from the Grades page. Students cannot see other students' grades or submissions.",
  },
  {
    id: "roles",
    title: "Account Roles",
    content:
      "Instructors create and manage courses, modules, lessons, and milestones, and grade student submissions. Students enroll in courses, view content, and submit assignment links for their own milestones.",
  },
];

export function formatPolicyContext(): string {
  return platformPolicies
    .map((p) => `[${p.title}]\n${p.content}`)
    .join("\n\n");
}
