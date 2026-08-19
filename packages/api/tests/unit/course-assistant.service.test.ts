import { AIError, AIErrorCode } from "../../src/services/ai";
import {
  answerCourseQuestion,
  COURSE_INDEX_WAIT_TIMEOUT_MS,
  MAX_COURSE_ASSISTANT_HISTORY_MESSAGES,
} from "../../src/services/ai/course-assistant.service";
import type { CourseSemanticSearchResult } from "../../src/services/ai/rag/course-retrieval.service";
import {
  buildBoundedCourseGroundingSources,
  COURSE_ASSISTANT_SYSTEM_INSTRUCTION,
  formatCourseGroundingSource,
  INSUFFICIENT_COURSE_EVIDENCE_ANSWER,
  validateAnswerCitations,
} from "../../src/services/ai/rag/grounding-prompt";
import type { CourseRagConfig } from "../../src/services/ai/rag/rag-config";

const ragConfig: CourseRagConfig = {
  retrievalLimit: 6,
  minimumSimilarity: 0.75,
  maximumSourceCharacters: 100,
  maximumContextCharacters: 1_000,
};

function result(
  number: number,
  overrides: Partial<CourseSemanticSearchResult> = {},
): CourseSemanticSearchResult {
  return {
    chunkId: `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`,
    courseId: "00000000-0000-4000-8000-000000000100",
    moduleId: "00000000-0000-4000-8000-000000000200",
    lessonId: `00000000-0000-4000-8000-${String(number + 300).padStart(12, "0")}`,
    sourceType: "lesson",
    sourceTitle: `Lesson ${number}`,
    chunkIndex: number - 1,
    excerpt: `Source ${number} course content`,
    similarity: 0.9 - number / 100,
    ...overrides,
  };
}

function dependencies(
  results: CourseSemanticSearchResult[],
  answer = "Supported answer [1].",
) {
  const index = jest.fn(async () => undefined);
  const search = jest.fn(async () => results);
  const generateText = jest.fn(async () => ({ text: answer, steps: [] }));
  return { index, search, generateText, ragConfig };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

describe("answerCourseQuestion", () => {
  afterEach(() => jest.useRealTimers());

  it("awaits fast indexing before retrieving the authorized course", async () => {
    const fixture = dependencies([result(1)]);
    const indexing = deferred<void>();
    fixture.index.mockReturnValueOnce(indexing.promise);

    const answer = answerCourseQuestion(
      {
        courseId: result(1).courseId,
        message: "What is the main idea?",
      },
      fixture,
    );

    await Promise.resolve();
    expect(fixture.search).not.toHaveBeenCalled();
    indexing.resolve();
    await answer;

    expect(fixture.index).toHaveBeenCalledWith(result(1).courseId);
    expect(fixture.search).toHaveBeenCalledWith({
      courseId: result(1).courseId,
      query: "What is the main idea?",
      limit: 6,
    });
    expect(fixture.index.mock.invocationCallOrder[0]).toBeLessThan(
      fixture.search.mock.invocationCallOrder[0]!,
    );
  });

  it("continues retrieval when slow indexing reaches the bounded wait", async () => {
    jest.useFakeTimers();
    const fixture = dependencies([]);
    const indexing = deferred<void>();
    fixture.index.mockReturnValueOnce(indexing.promise);

    const answer = answerCourseQuestion(
      { courseId: "course-1", message: "Question?" },
      fixture,
    );
    await Promise.resolve();
    expect(fixture.search).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(COURSE_INDEX_WAIT_TIMEOUT_MS);

    await expect(answer).resolves.toEqual({
      type: "message",
      answer: INSUFFICIENT_COURSE_EVIDENCE_ANSWER,
      sources: [],
    });
    expect(fixture.search).toHaveBeenCalledTimes(1);

    indexing.resolve();
    await indexing.promise;
  });

  it("keeps timed-out single-flight indexing active without duplicate work", async () => {
    jest.useFakeTimers();
    const fixture = dependencies([]);
    const indexing = deferred<void>();
    const startIndexing = jest.fn(() => indexing.promise);
    let activeIndex: Promise<void> | undefined;
    fixture.index.mockImplementation(() => {
      activeIndex ??= startIndexing();
      return activeIndex;
    });

    const first = answerCourseQuestion(
      { courseId: "course-1", message: "First question?" },
      fixture,
    );
    const second = answerCourseQuestion(
      { courseId: "course-1", message: "Second question?" },
      fixture,
    );
    await Promise.resolve();

    expect(startIndexing).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(COURSE_INDEX_WAIT_TIMEOUT_MS);
    await Promise.all([first, second]);

    expect(fixture.search).toHaveBeenCalledTimes(2);
    expect(startIndexing).toHaveBeenCalledTimes(1);
    indexing.resolve();
    await indexing.promise;
  });

  it("lets a later request use chunks produced by timed-out indexing", async () => {
    jest.useFakeTimers();
    const fixture = dependencies([]);
    const indexing = deferred<void>();
    let indexed = false;
    void indexing.promise.then(() => {
      indexed = true;
    });
    fixture.index.mockImplementation(() =>
      indexed ? Promise.resolve() : indexing.promise,
    );
    fixture.search.mockImplementation(async () => (indexed ? [result(1)] : []));

    const first = answerCourseQuestion(
      { courseId: "course-1", message: "First question?" },
      fixture,
    );
    await jest.advanceTimersByTimeAsync(COURSE_INDEX_WAIT_TIMEOUT_MS);
    await expect(first).resolves.toEqual({
      type: "message",
      answer: INSUFFICIENT_COURSE_EVIDENCE_ANSWER,
      sources: [],
    });

    indexing.resolve();
    await indexing.promise;
    await Promise.resolve();

    await expect(
      answerCourseQuestion(
        { courseId: "course-1", message: "Try again?" },
        fixture,
      ),
    ).resolves.toEqual({
      type: "message",
      answer: "Supported answer [1].",
      sources: [{ type: "lesson", id: result(1).lessonId, title: "Lesson 1" }],
    });
  });

  it("observes a late indexing rejection without an unhandled rejection", async () => {
    jest.useFakeTimers();
    const fixture = dependencies([]);
    const indexing = deferred<void>();
    const unhandledRejection = jest.fn();
    process.on("unhandledRejection", unhandledRejection);
    fixture.index.mockReturnValueOnce(indexing.promise);

    try {
      const answer = answerCourseQuestion(
        { courseId: "course-1", message: "Question?" },
        fixture,
      );
      await jest.advanceTimersByTimeAsync(COURSE_INDEX_WAIT_TIMEOUT_MS);
      await expect(answer).resolves.toEqual({
        type: "message",
        answer: INSUFFICIENT_COURSE_EVIDENCE_ANSWER,
        sources: [],
      });

      indexing.reject(new Error("secret provider detail"));
      await Promise.resolve();
      await Promise.resolve();

      expect(unhandledRejection).not.toHaveBeenCalled();
      expect(fixture.search).toHaveBeenCalledTimes(1);
    } finally {
      process.off("unhandledRejection", unhandledRejection);
    }
  });

  it("does not call Gemini when retrieval has no evidence", async () => {
    const fixture = dependencies([]);

    await expect(
      answerCourseQuestion(
        { courseId: "course-1", message: "Missing?" },
        fixture,
      ),
    ).resolves.toEqual({
      type: "message",
      answer: INSUFFICIENT_COURSE_EVIDENCE_ANSWER,
      sources: [],
    });
    expect(fixture.generateText).not.toHaveBeenCalled();
  });

  it("filters low-similarity chunks before generation", async () => {
    const fixture = dependencies([
      result(1, { similarity: 0.2 }),
      result(2, { similarity: 0.88 }),
    ]);

    await answerCourseQuestion(
      { courseId: "course-1", message: "Question?" },
      fixture,
    );

    const request = fixture.generateText.mock.calls[0]?.[0];
    expect(request?.input).not.toContain("Source 1 course content");
    expect(request?.input).toContain("Source 2 course content");
  });

  it("uses the existing Gemini contract with a bounded grounding prompt", async () => {
    const fixture = dependencies([result(1)]);

    const response = await answerCourseQuestion(
      { courseId: "course-1", message: "Explain this lesson." },
      fixture,
    );

    expect(fixture.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: COURSE_ASSISTANT_SYSTEM_INSTRUCTION,
        history: [],
        input: expect.stringContaining("UNTRUSTED AUTHORIZED COURSE SOURCES"),
      }),
    );
    expect(response).toEqual({
      type: "message",
      answer: "Supported answer [1].",
      sources: [
        {
          type: "lesson",
          id: result(1).lessonId,
          title: "Lesson 1",
        },
      ],
    });
  });

  it("deduplicates cited chunks from the same lesson", async () => {
    const sameLesson = "00000000-0000-4000-8000-000000000777";
    const fixture = dependencies(
      [
        result(1, { lessonId: sameLesson, chunkIndex: 0 }),
        result(2, { lessonId: sameLesson, chunkIndex: 1 }),
      ],
      "Both chunks support this [1][2].",
    );

    const response = await answerCourseQuestion(
      { courseId: "course-1", message: "Question?" },
      fixture,
    );

    expect(response.sources).toEqual([
      { type: "lesson", id: sameLesson, title: "Lesson 1" },
    ]);
  });

  it("returns metadata only for sources cited by the answer", async () => {
    const fixture = dependencies(
      [result(1), result(2)],
      "Only the second lesson supports this [2].",
    );

    const response = await answerCourseQuestion(
      { courseId: "course-1", message: "Question?" },
      fixture,
    );

    expect(response.sources).toEqual([
      {
        type: "lesson",
        id: result(2).lessonId,
        title: "Lesson 2",
      },
    ]);
  });

  it("bounds recent text-only conversation history", async () => {
    const fixture = dependencies([result(1)]);
    const history = Array.from({ length: 12 }, (_value, index) => ({
      role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `message-${index}`,
    }));

    await answerCourseQuestion(
      { courseId: "course-1", message: "Current question", history },
      fixture,
    );

    const sentHistory = fixture.generateText.mock.calls[0]?.[0].history;
    expect(sentHistory).toHaveLength(MAX_COURSE_ASSISTANT_HISTORY_MESSAGES);
    expect(sentHistory?.[0]?.content).toBe("message-4");
    expect(sentHistory?.at(-1)?.content).toBe("message-11");
  });

  it("rejects an uncited Gemini answer", async () => {
    const fixture = dependencies([result(1)], "Unsupported answer");

    await expect(
      answerCourseQuestion(
        { courseId: "course-1", message: "Question?" },
        fixture,
      ),
    ).rejects.toMatchObject({
      statusCode: 502,
      message: "Course assistant returned an invalid answer",
    });
  });

  it("maps provider failures to a safe operational error", async () => {
    const fixture = dependencies([result(1)]);
    fixture.generateText.mockRejectedValueOnce(
      new AIError(AIErrorCode.PROVIDER_ERROR, {
        cause: new Error("secret provider detail"),
      }),
    );

    await expect(
      answerCourseQuestion(
        { courseId: "course-1", message: "Question?" },
        fixture,
      ),
    ).rejects.toMatchObject({
      statusCode: 502,
      isOperational: true,
      message: "Course assistant could not generate an answer",
    });
  });

  it("maps indexing rejection before the wait bound to a safe 503", async () => {
    const fixture = dependencies([result(1)]);
    fixture.index.mockRejectedValueOnce(new Error("database credentials"));

    await expect(
      answerCourseQuestion(
        { courseId: "course-1", message: "Question?" },
        fixture,
      ),
    ).rejects.toMatchObject({
      statusCode: 503,
      message: "Course material retrieval is temporarily unavailable",
    });
    expect(fixture.generateText).not.toHaveBeenCalled();
  });
});

describe("course grounding and citations", () => {
  it("bounds each source and the total serialized context", () => {
    const sources = buildBoundedCourseGroundingSources(
      [
        result(1, { excerpt: "a".repeat(500) }),
        result(2, { excerpt: "b".repeat(500) }),
      ],
      {
        ...ragConfig,
        minimumSimilarity: 0,
        maximumSourceCharacters: 100,
        maximumContextCharacters: 250,
      },
    );

    expect(sources[0]?.excerpt.length).toBeLessThanOrEqual(100);
    expect(
      sources.map(formatCourseGroundingSource).join("\n\n").length,
    ).toBeLessThanOrEqual(250);
  });

  it("deduplicates valid citations and removes invalid markers", () => {
    expect(
      validateAnswerCitations(
        "Supported [2], repeated [2], first [1], invalid [99].",
        2,
      ),
    ).toEqual({
      answer: "Supported [2], repeated [2], first [1], invalid.",
      citationNumbers: [2, 1],
    });
  });
});
