import { assistantMessageSchema } from "../../src/schemas/assistant.schemas";

describe("assistantMessageSchema", () => {
  it("trims valid messages", () => {
    expect(assistantMessageSchema.parse({ message: "  Hello  " })).toEqual({
      message: "Hello",
    });
  });

  it.each(["", "   ", "a".repeat(1501), undefined])(
    "rejects invalid message %p",
    (message) => {
      expect(() => assistantMessageSchema.parse({ message })).toThrow();
    },
  );
});
