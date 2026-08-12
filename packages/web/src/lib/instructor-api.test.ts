import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api-client";
import type { Course } from "./courses-api";
import { getCourseSubmissions } from "./instructor-api";

vi.mock("./api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const getMock = vi.mocked(apiClient.get);

function response(data: unknown) {
  return { data: { data } } as never;
}

describe("getCourseSubmissions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("limits concurrent milestone and submission requests", async () => {
    const course: Course = {
      id: "course-1",
      instructorId: "instructor-1",
      title: "Full Stack Bootcamp",
      description: "Build applications",
      isPublished: true,
    };
    const modules = Array.from({ length: 8 }, (_, index) => ({
      id: `module-${index}`,
      courseId: course.id,
      title: `Module ${index}`,
      order: index,
    }));
    let activeMilestones = 0;
    let maxActiveMilestones = 0;
    let activeSubmissions = 0;
    let maxActiveSubmissions = 0;

    getMock.mockImplementation(async (url) => {
      if (url === "/courses/course-1/modules") return response(modules);

      const moduleMatch = /^\/modules\/(module-\d+)\/milestones$/.exec(url);
      if (moduleMatch) {
        activeMilestones += 1;
        maxActiveMilestones = Math.max(maxActiveMilestones, activeMilestones);
        await new Promise((resolve) => setTimeout(resolve, 5));
        activeMilestones -= 1;
        const index = moduleMatch[1].replace("module-", "");
        return response([
          {
            id: `milestone-${index}`,
            moduleId: moduleMatch[1],
            title: `Milestone ${index}`,
            instructions: "Build it",
            acceptanceCriteria: "It works",
          },
        ]);
      }

      const milestoneMatch =
        /^\/milestones\/(milestone-\d+)\/submissions$/.exec(url);
      if (milestoneMatch) {
        activeSubmissions += 1;
        maxActiveSubmissions = Math.max(
          maxActiveSubmissions,
          activeSubmissions,
        );
        await new Promise((resolve) => setTimeout(resolve, 5));
        activeSubmissions -= 1;
        const index = milestoneMatch[1].replace("milestone-", "");
        return response([
          {
            id: `submission-${index}`,
            milestoneId: milestoneMatch[1],
            studentId: `student-${index}`,
            student: {
              id: `student-${index}`,
              name: `Student ${index}`,
              email: `student-${index}@example.com`,
            },
            status: "submitted",
            links: [],
          },
        ]);
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const submissions = await getCourseSubmissions(course);

    expect(submissions).toHaveLength(8);
    expect(maxActiveMilestones).toBe(4);
    expect(maxActiveSubmissions).toBe(4);
    expect(submissions.map((item) => item.id)).toEqual(
      modules.map((_, index) => `submission-${index}`),
    );
  });
});
