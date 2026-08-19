import type { Interactions } from "@google/genai";
import { AIError, AIErrorCode } from "../../src/services/ai";
import {
  answerInstructorQuestion,
  INSTRUCTOR_ASSISTANT_SYSTEM_INSTRUCTION,
  MAX_INSTRUCTOR_TOOL_CALLS_PER_ROUND,
  MAX_INSTRUCTOR_TOOL_ROUNDS,
} from "../../src/services/ai/instructor/instructor-assistant.service";
import {
  InstructorToolError,
  InstructorToolErrorCode,
} from "../../src/services/ai/instructor/instructor-tool.types";

const options = {
  courseId: "00000000-0000-4000-8000-000000000001",
  instructorId: "00000000-0000-4000-8000-000000000002",
  message: "How much grading is left?",
};

function call(
  name: string,
  args: Record<string, unknown> = {},
  id = `call-${name}`,
): Interactions.FunctionCallStep {
  return { type: "function_call", id, name, arguments: args };
}

function toolTurn(...functionCalls: Interactions.FunctionCallStep[]) {
  return {
    steps: functionCalls,
    functionCalls,
  };
}

function finalTurn(text = "There are two submissions waiting for grading.") {
  const steps: Interactions.Step[] = [
    {
      type: "model_output",
      content: [{ type: "text", text }],
    },
  ];
  return { text, steps, functionCalls: [] };
}

function execution(data: Record<string, unknown>, sources: any[] = []) {
  return { data, sources };
}

describe("Instructor Assistant function loop", () => {
  it("lets Gemini select course content search and returns lesson sources", async () => {
    const generate = jest
      .fn()
      .mockResolvedValueOnce(
        toolTurn(call("search_course_content", { query: "refresh tokens" })),
      )
      .mockResolvedValueOnce(finalTurn("You taught token rotation."));
    const execute = jest.fn(async () =>
      execution(
        {
          query: "refresh tokens",
          matches: [{ lessonId: "lesson-1", excerpt: "Rotate tokens." }],
        },
        [{ type: "lesson", id: "lesson-1", title: "Authentication" }],
      ),
    );

    await expect(
      answerInstructorQuestion(options, {
        generateToolInteraction: generate,
        executeTool: execute as any,
      }),
    ).resolves.toEqual({
      type: "message",
      answer: "You taught token rotation.",
      sources: [{ type: "lesson", id: "lesson-1", title: "Authentication" }],
    });
    expect(execute).toHaveBeenCalledWith(
      {
        name: "search_course_content",
        arguments: { query: "refresh tokens" },
      },
      { courseId: options.courseId, instructorId: options.instructorId },
      {},
    );
  });

  it("executes pending grading and returns its deterministic result to Gemini", async () => {
    const functionCall = call("get_pending_grading");
    const generate = jest
      .fn()
      .mockResolvedValueOnce(toolTurn(functionCall))
      .mockResolvedValueOnce(finalTurn());
    const execute = jest.fn(async () =>
      execution({ totalPending: 2, byMilestone: [] }),
    );

    await answerInstructorQuestion(options, {
      generateToolInteraction: generate,
      executeTool: execute as any,
    });

    expect(execute).toHaveBeenCalledWith(
      { name: "get_pending_grading", arguments: {} },
      { courseId: options.courseId, instructorId: options.instructorId },
      {},
    );
    const secondInput = generate.mock.calls[1]?.[0]
      .input as Interactions.Step[];
    expect(secondInput).toContainEqual(functionCall);
    expect(secondInput).toContainEqual({
      type: "function_result",
      name: "get_pending_grading",
      call_id: functionCall.id,
      result: [
        {
          type: "text",
          text: JSON.stringify({ totalPending: 2, byMilestone: [] }),
        },
      ],
    });
  });

  it("uses stateless application history and the instructor system instruction", async () => {
    const generate = jest.fn(async () => finalTurn("Answer"));

    await answerInstructorQuestion(
      {
        ...options,
        history: Array.from({ length: 10 }, (_value, index) => ({
          role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
          content: ` history-${index} `,
        })),
      },
      { generateToolInteraction: generate },
    );

    const request = generate.mock.calls[0]?.[0];
    expect(request.systemInstruction).toBe(
      INSTRUCTOR_ASSISTANT_SYSTEM_INSTRUCTION,
    );
    expect(request.tools).toHaveLength(5);
    expect(request.input).toHaveLength(9);
    expect(request.input[0]).toMatchObject({
      type: "user_input",
      content: [{ type: "text", text: "history-2" }],
    });
    expect(request.input.at(-1)).toMatchObject({
      type: "user_input",
      content: [{ type: "text", text: options.message }],
    });
  });

  it("executes multiple validated read-only calls and deduplicates sources", async () => {
    const generate = jest
      .fn()
      .mockResolvedValueOnce(
        toolTurn(
          call("get_pending_grading", {}, "pending-call"),
          call("get_submission_stats", {}, "stats-call"),
        ),
      )
      .mockResolvedValueOnce(finalTurn("Combined answer"));
    const execute = jest
      .fn()
      .mockResolvedValueOnce(
        execution({ totalPending: 2 }, [
          { type: "milestone", id: "milestone-1", title: "Auth" },
        ]),
      )
      .mockResolvedValueOnce(
        execution({ gradedSubmissions: 3 }, [
          { type: "milestone", id: "milestone-1", title: "Auth" },
        ]),
      );

    const result = await answerInstructorQuestion(options, {
      generateToolInteraction: generate,
      executeTool: execute as any,
    });

    expect(execute).toHaveBeenCalledTimes(2);
    expect(result.sources).toEqual([
      { type: "milestone", id: "milestone-1", title: "Auth" },
    ]);
    const resultSteps = (
      generate.mock.calls[1]?.[0].input as Interactions.Step[]
    ).filter((step) => step.type === "function_result");
    expect(resultSteps).toHaveLength(2);
  });

  it.each([
    [call("unsupported_tool")],
    [call("get_course_overview", { courseId: "attacker" })],
    [{ ...call("get_course_overview"), id: "" }],
  ])(
    "rejects unsupported or malformed function calls before execution",
    async (badCall) => {
      const generate = jest.fn(async () =>
        toolTurn(badCall as Interactions.FunctionCallStep),
      );
      const execute = jest.fn();

      await expect(
        answerInstructorQuestion(options, {
          generateToolInteraction: generate,
          executeTool: execute as any,
        }),
      ).rejects.toMatchObject({
        statusCode: 502,
        message: "Instructor assistant requested an invalid tool operation",
      });
      expect(execute).not.toHaveBeenCalled();
    },
  );

  it("bounds repeated tool calls to three execution rounds", async () => {
    let turn = 0;
    const generate = jest.fn(async () => {
      turn += 1;
      return toolTurn(call("get_course_overview", {}, `call-${turn}`));
    });
    const execute = jest.fn(async () => execution({ title: "Course" }));

    await expect(
      answerInstructorQuestion(options, {
        generateToolInteraction: generate,
        executeTool: execute as any,
      }),
    ).rejects.toMatchObject({
      statusCode: 502,
      message: "Instructor assistant exceeded the tool execution limit",
    });
    expect(execute).toHaveBeenCalledTimes(MAX_INSTRUCTOR_TOOL_ROUNDS);
    expect(generate).toHaveBeenCalledTimes(MAX_INSTRUCTOR_TOOL_ROUNDS + 1);
  });

  it("bounds multiple calls within one tool round", async () => {
    const generate = jest.fn(async () =>
      toolTurn(
        ...Array.from(
          { length: MAX_INSTRUCTOR_TOOL_CALLS_PER_ROUND + 1 },
          (_value, index) => call("get_course_overview", {}, `call-${index}`),
        ),
      ),
    );
    const execute = jest.fn();

    await expect(
      answerInstructorQuestion(options, {
        generateToolInteraction: generate,
        executeTool: execute as any,
      }),
    ).rejects.toMatchObject({
      statusCode: 502,
      message: "Instructor assistant requested too many tool operations",
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("maps tool failures without leaking database details", async () => {
    const generate = jest.fn(async () => toolTurn(call("get_course_overview")));
    const execute = jest.fn(async () => {
      throw new InstructorToolError(InstructorToolErrorCode.EXECUTION_FAILED, {
        cause: new Error("secret database detail"),
      });
    });

    await expect(
      answerInstructorQuestion(options, {
        generateToolInteraction: generate,
        executeTool: execute as any,
      }),
    ).rejects.toMatchObject({
      statusCode: 503,
      message: "Instructor assistant data is temporarily unavailable",
    });
  });

  it("maps provider failures to safe API errors", async () => {
    const generate = jest.fn(async () => {
      throw new AIError(AIErrorCode.PROVIDER_ERROR, {
        cause: new Error("secret provider response"),
      });
    });

    await expect(
      answerInstructorQuestion(options, {
        generateToolInteraction: generate,
      }),
    ).rejects.toMatchObject({
      statusCode: 502,
      message: "Instructor assistant could not generate an answer",
    });
  });

  it("rejects an empty final response safely", async () => {
    const generate = jest.fn(async () => ({
      steps: [],
      functionCalls: [],
    }));

    await expect(
      answerInstructorQuestion(options, {
        generateToolInteraction: generate,
      }),
    ).rejects.toMatchObject({
      statusCode: 502,
      message: "Instructor assistant returned an invalid answer",
    });
  });
});
