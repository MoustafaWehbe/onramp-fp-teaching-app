import { describe, expect, it } from "vitest";
import {
  courseAssistant,
  generalAssistant,
  instructorAssistant,
} from "./assistant-configs";

describe("assistant identity configs", () => {
  it("defines the General assistant identity", () => {
    expect(generalAssistant).toMatchObject({
      id: "general",
      name: "MentorLane Assistant",
      badge: "GENERAL",
      subtitle: "Platform Help",
    });
    expect(generalAssistant.suggestedPrompts).toHaveLength(3);
  });

  it("uses the real course ID for Course conversation identity", () => {
    const first = courseAssistant("course-1", "Repeated title");
    const second = courseAssistant("course-2", "Repeated title");

    expect(first.id).toBe("course:course-1");
    expect(second.id).toBe("course:course-2");
    expect(first.subtitle).toBe("Repeated title");
    expect(first.badge).toBe("COURSE");
  });

  it("uses a stable ID and managing subtitle with instructor course context", () => {
    expect(instructorAssistant("course-7", "TypeScript Basics")).toMatchObject({
      id: "instructor:course-7",
      subtitle: "Managing: TypeScript Basics",
    });
  });

  it("suggests only operations supported by the current schema", () => {
    const config = instructorAssistant("course-7", "TypeScript Basics");

    expect(config.description).not.toMatch(/deadline|due date|overdue/i);
    expect(config.suggestedPrompts.join(" ")).not.toMatch(
      /deadline|due next|overdue/i,
    );
  });
});
