import type {
  CourseIngestionRepository,
  LessonKnowledgeSource,
  PersistedLessonChunk,
} from "../../src/services/ai/rag/course-ingestion.service";
import {
  indexCourse,
  indexLesson,
} from "../../src/services/ai/rag/course-ingestion.service";
import type { DocumentChunk } from "../../src/services/ai/rag/chunk-text";
import type { EmbeddingProvider } from "../../src/services/ai/rag/embedding-provider";

function vector(): number[] {
  return [1, ...Array.from({ length: 383 }, () => 0)];
}

function provider(): EmbeddingProvider & {
  embedPassages: jest.Mock<Promise<number[][]>, [readonly string[]]>;
} {
  return {
    modelId: "fixture-e5",
    modelVersion: "fixture-v1",
    dimension: 384,
    embedPassage: jest.fn(async () => vector()),
    embedQuery: jest.fn(async () => vector()),
    embedPassages: jest.fn(async (contents: readonly string[]) =>
      contents.map(() => vector()),
    ),
  };
}

function source(content = "Lesson content"): LessonKnowledgeSource {
  return {
    lessonId: "lesson-1",
    moduleId: "module-1",
    courseId: "course-1",
    title: "React Query Fundamentals",
    content,
  };
}

function persistedChunk(
  chunk: DocumentChunk,
  currentSource = source(),
  currentProvider = provider(),
): PersistedLessonChunk {
  return {
    ...chunk,
    courseId: currentSource.courseId,
    moduleId: currentSource.moduleId,
    lessonId: currentSource.lessonId,
    sourceTitle: currentSource.title,
    embeddingModel: currentProvider.modelId,
    embeddingVersion: currentProvider.modelVersion,
    embeddedContentHash: chunk.contentHash,
  };
}

function repositoryFixture(initialSource = source()) {
  let currentSource = initialSource;
  let persisted: PersistedLessonChunk[] = [];
  const replaceLessonChunks = jest.fn(
    async (
      nextSource: LessonKnowledgeSource,
      chunks: readonly DocumentChunk[],
      _embeddings: readonly number[][],
      currentProvider: EmbeddingProvider,
    ) => {
      const deleted = persisted.length;
      persisted = chunks.map((chunk) =>
        persistedChunk(chunk, nextSource, currentProvider),
      );
      return deleted;
    },
  );
  const deleteLessonChunks = jest.fn(async () => {
    const deleted = persisted.length;
    persisted = [];
    return deleted;
  });
  const repository: CourseIngestionRepository = {
    findLesson: jest.fn(async () => currentSource),
    listCourseLessonIds: jest.fn(async () => [currentSource.lessonId]),
    listLessonChunks: jest.fn(async () => persisted),
    replaceLessonChunks,
    deleteLessonChunks,
  };

  return {
    repository,
    replaceLessonChunks,
    deleteLessonChunks,
    persisted: () => persisted,
    setSource: (nextSource: LessonKnowledgeSource) => {
      currentSource = nextSource;
    },
  };
}

describe("course lesson ingestion", () => {
  it("turns lesson content into embedded chunks with course metadata", async () => {
    const fixture = repositoryFixture(
      source(
        `${"First concept. ".repeat(80)}\n\n${"Second concept. ".repeat(80)}`,
      ),
    );
    const embeddingProvider = provider();

    const summary = await indexLesson("lesson-1", {
      repository: fixture.repository,
      provider: embeddingProvider,
    });

    expect(summary.created).toBeGreaterThan(1);
    expect(embeddingProvider.embedPassages).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining("First concept")]),
    );
    expect(fixture.replaceLessonChunks).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: "course-1",
        moduleId: "module-1",
        lessonId: "lesson-1",
        title: "React Query Fundamentals",
      }),
      expect.any(Array),
      expect.any(Array),
      embeddingProvider,
    );
    expect(fixture.persisted()).toHaveLength(summary.created);
  });

  it("retains current chunks without embedding again", async () => {
    const fixture = repositoryFixture();
    const embeddingProvider = provider();
    await indexLesson("lesson-1", {
      repository: fixture.repository,
      provider: embeddingProvider,
    });
    embeddingProvider.embedPassages.mockClear();
    fixture.replaceLessonChunks.mockClear();

    const summary = await indexLesson("lesson-1", {
      repository: fixture.repository,
      provider: embeddingProvider,
    });

    expect(summary).toMatchObject({
      synchronized: true,
      created: 0,
      retained: 1,
      deletedOrReplaced: 0,
    });
    expect(embeddingProvider.embedPassages).not.toHaveBeenCalled();
    expect(fixture.replaceLessonChunks).not.toHaveBeenCalled();
  });

  it("replaces stale chunks when lesson content changes", async () => {
    const fixture = repositoryFixture(source("Old lesson content"));
    const embeddingProvider = provider();
    await indexLesson("lesson-1", {
      repository: fixture.repository,
      provider: embeddingProvider,
    });
    fixture.setSource(source("Updated lesson content with new guidance"));

    const summary = await indexLesson("lesson-1", {
      repository: fixture.repository,
      provider: embeddingProvider,
    });

    expect(summary).toMatchObject({
      synchronized: false,
      created: 1,
      deletedOrReplaced: 1,
    });
    expect(fixture.persisted()[0]?.content).toBe(
      "Updated lesson content with new guidance",
    );
  });

  it("replaces chunks when the lesson moves to different course metadata", async () => {
    const fixture = repositoryFixture(source("Unchanged lesson content"));
    const embeddingProvider = provider();
    await indexLesson("lesson-1", {
      repository: fixture.repository,
      provider: embeddingProvider,
    });
    fixture.setSource({
      ...source("Unchanged lesson content"),
      moduleId: "module-2",
      courseId: "course-2",
    });

    const summary = await indexLesson("lesson-1", {
      repository: fixture.repository,
      provider: embeddingProvider,
    });

    expect(summary).toMatchObject({
      synchronized: false,
      created: 1,
      deletedOrReplaced: 1,
    });
    expect(fixture.persisted()[0]).toMatchObject({
      courseId: "course-2",
      moduleId: "module-2",
      lessonId: "lesson-1",
    });
  });

  it("removes chunks when written lesson content becomes empty", async () => {
    const fixture = repositoryFixture(source("Content to remove"));
    const embeddingProvider = provider();
    await indexLesson("lesson-1", {
      repository: fixture.repository,
      provider: embeddingProvider,
    });
    fixture.setSource(source(" \n\t "));
    embeddingProvider.embedPassages.mockClear();

    const summary = await indexLesson("lesson-1", {
      repository: fixture.repository,
      provider: embeddingProvider,
    });

    expect(summary.created).toBe(0);
    expect(summary.deletedOrReplaced).toBe(1);
    expect(fixture.persisted()).toEqual([]);
    expect(embeddingProvider.embedPassages).toHaveBeenCalledWith([]);
  });

  it("invalidates stale chunks if refreshed embedding fails", async () => {
    const fixture = repositoryFixture(source("Old content"));
    const embeddingProvider = provider();
    await indexLesson("lesson-1", {
      repository: fixture.repository,
      provider: embeddingProvider,
    });
    fixture.setSource(source("New content"));
    embeddingProvider.embedPassages.mockRejectedValueOnce(
      new Error("model unavailable"),
    );

    await expect(
      indexLesson("lesson-1", {
        repository: fixture.repository,
        provider: embeddingProvider,
      }),
    ).rejects.toThrow("model unavailable");
    expect(fixture.deleteLessonChunks).toHaveBeenCalledWith("lesson-1");
    expect(fixture.persisted()).toEqual([]);
  });

  it("indexes every lesson in a course and reports aggregate counts", async () => {
    const sources = new Map([
      ["lesson-1", source("First lesson")],
      [
        "lesson-2",
        {
          ...source("Second lesson"),
          lessonId: "lesson-2",
          title: "Second lesson",
        },
      ],
    ]);
    const chunks = new Map<string, PersistedLessonChunk[]>();
    const repository: CourseIngestionRepository = {
      findLesson: jest.fn(async (id) => sources.get(id) ?? null),
      listCourseLessonIds: jest.fn(async () => [...sources.keys()]),
      listLessonChunks: jest.fn(async (id) => chunks.get(id) ?? []),
      replaceLessonChunks: jest.fn(
        async (lesson, nextChunks, _vectors, currentProvider) => {
          chunks.set(
            lesson.lessonId,
            nextChunks.map((chunk) =>
              persistedChunk(chunk, lesson, currentProvider),
            ),
          );
          return 0;
        },
      ),
      deleteLessonChunks: jest.fn(async () => 0),
    };

    await expect(
      indexCourse("course-1", { repository, provider: provider() }),
    ).resolves.toMatchObject({
      courseId: "course-1",
      lessonsInspected: 2,
      lessonsChanged: 2,
      chunksCreated: 2,
    });
  });
});
