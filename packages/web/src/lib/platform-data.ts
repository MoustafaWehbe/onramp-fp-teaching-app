// UI seed data ported from the Lovable prototype. Replace these exports with
// API queries as the course and submission endpoints are implemented.
export type Status = "draft" | "submitted" | "graded";

export const courses = [
  {
    id: "c1",
    title: "Full-Stack Web Development",
    description:
      "Build production-grade web applications from the browser to the database. Covers HTML, CSS, JavaScript, React, Node, and PostgreSQL.",
    modules: [
      {
        id: "m1",
        number: 1,
        title: "Frontend Basics",
        lessons: [
          { id: "l1", title: "HTML semantics and accessibility" },
          { id: "l2", title: "Modern CSS layout: Flexbox & Grid" },
          { id: "l3", title: "JavaScript fundamentals" },
        ],
        milestones: [
          {
            id: "ms1",
            title: "Personal portfolio page",
            status: "graded" as Status,
          },
        ],
      },
      {
        id: "m2",
        number: 2,
        title: "React Foundations",
        lessons: [
          { id: "l4", title: "Components and props" },
          { id: "l5", title: "State and effects" },
          { id: "l6", title: "Forms and validation" },
        ],
        milestones: [
          {
            id: "ms2",
            title: "Interactive todo app",
            status: "submitted" as Status,
          },
        ],
      },
      {
        id: "m3",
        number: 3,
        title: "Backend & APIs",
        lessons: [
          { id: "l7", title: "Node.js & Express" },
          { id: "l8", title: "REST API design" },
          { id: "l9", title: "Authentication patterns" },
        ],
        milestones: [
          {
            id: "ms3",
            title: "Build a JSON API",
            status: "draft" as Status,
          },
        ],
      },
    ],
  },
  {
    id: "c2",
    title: "Data Analytics with Python",
    description:
      "Learn to clean, analyze, and visualize real-world datasets using Python, Pandas, and modern analytics tooling.",
    modules: [
      {
        id: "m4",
        number: 1,
        title: "Python Essentials",
        lessons: [
          { id: "l10", title: "Syntax and data types" },
          { id: "l11", title: "Working with files" },
        ],
        milestones: [
          {
            id: "ms4",
            title: "CSV data cleanup",
            status: "draft" as Status,
          },
        ],
      },
      {
        id: "m5",
        number: 2,
        title: "Pandas Deep Dive",
        lessons: [
          { id: "l12", title: "DataFrames and Series" },
          { id: "l13", title: "Grouping and aggregation" },
        ],
        milestones: [
          {
            id: "ms5",
            title: "Sales analysis report",
            status: "draft" as Status,
          },
        ],
      },
    ],
  },
];

export function findMilestone(id: string) {
  for (const course of courses) {
    for (const module of course.modules) {
      const milestone = module.milestones.find((item) => item.id === id);
      if (milestone) return { course, module, milestone };
    }
  }
  return null;
}

export const recentActivity = [
  {
    id: "a1",
    milestoneTitle: "Personal portfolio page",
    status: "graded" as Status,
    when: "2 days ago",
    score: 92,
  },
  {
    id: "a2",
    milestoneTitle: "Interactive todo app",
    status: "submitted" as Status,
    when: "5 days ago",
  },
  {
    id: "a3",
    milestoneTitle: "Build a JSON API",
    status: "draft" as Status,
    when: "1 week ago",
  },
];

export const submissions = [
  {
    id: "s1",
    studentName: "Lina Haddad",
    studentEmail: "lina.haddad@example.com",
    courseTitle: "Full-Stack Web Development",
    moduleTitle: "Module 2 — React Foundations",
    milestoneTitle: "Interactive todo app",
    instructions:
      "Build a todo app with add, complete, and delete functionality. Persist state in localStorage and deploy it to a public URL.",
    acceptanceCriteria: [
      "All CRUD operations work without page reloads",
      "State persists across page refreshes",
      "Deployed and publicly accessible",
      "Code is committed to a public GitHub repository",
    ],
    links: [
      { type: "GitHub" as const, url: "https://github.com/example/todo-app" },
      { type: "Deployment" as const, url: "https://todo-app.vercel.app" },
      { type: "Loom" as const, url: "https://loom.com/share/abc123" },
    ],
    submittedAt: "Submitted on Jun 23, 2026",
    status: "submitted" as Status,
  },
];

export const studentProfile = {
  cohort: "Cohort 12 — Spring 2026",
  headline: "Aspiring full-stack developer",
  bio: "Second-year student focused on building accessible web apps. Loves React, PostgreSQL, and clean UI systems.",
  stats: {
    averageScore: 91,
    milestonesCompleted: 7,
    milestonesTotal: 12,
    certificates: 2,
  },
  scores: [
    {
      milestone: "Personal portfolio page",
      course: "Full-Stack Web Development",
      score: 92,
    },
    {
      milestone: "Responsive landing page",
      course: "Full-Stack Web Development",
      score: 88,
    },
    {
      milestone: "JavaScript fundamentals quiz",
      course: "Full-Stack Web Development",
      score: 95,
    },
    {
      milestone: "CSV data cleanup",
      course: "Data Analytics with Python",
      score: 89,
    },
  ],
  certificates: [
    {
      id: "cert-1",
      title: "Frontend Basics",
      issued: "Mar 2026",
      credentialId: "BC-FE-2026-0142",
    },
    {
      id: "cert-2",
      title: "Python Essentials",
      issued: "May 2026",
      credentialId: "BC-PY-2026-0311",
    },
  ],
  skills: [
    "HTML",
    "CSS",
    "JavaScript",
    "React",
    "TypeScript",
    "Python",
    "Pandas",
    "Git",
  ],
};

export const instructorProfile = {
  title: "Senior Instructor — Web Engineering",
  headline: "10+ years shipping production web apps",
  bio: "Former staff engineer turned educator. Specializes in frontend architecture, API design, and mentoring students through their first production deployment.",
  expertise: [
    "React",
    "TypeScript",
    "Node.js",
    "PostgreSQL",
    "System Design",
    "Code Review",
  ],
  teaching: [
    {
      course: "Full-Stack Web Development",
      role: "Lead Instructor",
      students: 42,
    },
    {
      course: "React Foundations Workshop",
      role: "Guest Instructor",
      students: 18,
    },
  ],
  stats: {
    yearsTeaching: 4,
    studentsMentored: 210,
    reviewsCompleted: 486,
    avgResponseHours: 12,
  },
};

