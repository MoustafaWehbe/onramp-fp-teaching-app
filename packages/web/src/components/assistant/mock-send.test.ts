import { describe, expect, it } from "vitest";
import {
  mockCourseAssistant,
  mockGeneralAssistant,
  mockInstructorAssistant,
} from "./mock-send";

describe("assistant UI mocks", () => {
  it("returns backend-compatible message responses for all identities", async () => {
    const [general, course, instructor] = await Promise.all([
      mockGeneralAssistant("Where are grades?", []),
      mockCourseAssistant("Explain the lesson", []),
      mockInstructorAssistant("What needs review?", []),
    ]);

    expect(general).toMatchObject({
      type: "message",
      sources: [{ type: "policy", title: "Grades" }],
    });
    expect(course).toMatchObject({
      type: "message",
      sources: [{ type: "lesson", title: "React Query Fundamentals" }],
    });
    expect(instructor).toMatchObject({ type: "message", sources: [] });
    expect(general).toHaveProperty("answer");
    expect(course).toHaveProperty("answer");
    expect(instructor).toHaveProperty("answer");
  });
});
