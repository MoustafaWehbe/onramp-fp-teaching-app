import { GeneralAssistantService } from "../../src/services/ai/general-assistant.service";

describe("GeneralAssistantService", () => {
  const service = new GeneralAssistantService();

  it("renders matching approved policy content and returns its source", async () => {
    const response = await service.respond("Where can I see my grades?");

    expect(response).toEqual({
      type: "message",
      answer:
        "Students can view graded submissions and feedback from the Grades page.",
      sources: [{ type: "policy", id: "grades", title: "Grades" }],
    });
  });

  it("redirects course or lesson questions before matching policies", async () => {
    const response = await service.respond(
      "How do I submit the next lesson milestone?",
    );

    expect(response).toEqual({
      type: "message",
      answer:
        "I do not have access to specific course or lesson details. Please ask the Course Assistant inside that course.",
    });
  });

  it("returns insufficient information for unsupported questions", async () => {
    const response = await service.respond("What time does support open?");

    expect(response).toEqual({
      type: "message",
      answer: "I do not have enough information to answer that question.",
    });
  });
});
