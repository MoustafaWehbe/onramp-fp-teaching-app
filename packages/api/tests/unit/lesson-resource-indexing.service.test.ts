import type { DocumentChunk } from "../../src/services/ai/rag/chunk-text";
import type { EmbeddingProvider } from "../../src/services/ai/rag/embedding-provider";
import {
  indexLessonResource,
  type ResourceIndexingRepository,
  type ResourceKnowledgeSource,
} from "../../src/services/ai/rag/lesson-resource-indexing.service";

const vector = () => [1, ...Array.from({ length: 383 }, () => 0)];
const provider = (): EmbeddingProvider & { embedPassages: jest.Mock } => ({
  modelId: "fixture-e5",
  modelVersion: "v1",
  dimension: 384,
  embedPassage: jest.fn(async () => vector()),
  embedQuery: jest.fn(async () => vector()),
  embedPassages: jest.fn(async (texts: readonly string[]) => texts.map(vector)),
});
const source: ResourceKnowledgeSource = {
  resourceId: "resource-1",
  lessonId: "lesson-1",
  moduleId: "module-1",
  courseId: "course-1",
  title: "Lecture PDF",
  content: "PDF content for the lesson",
};

function fixture() {
  let resourceChunks: any[] = [];
  const unrelated = [
    { resourceId: null, sourceType: "lesson", lessonId: "lesson-1" },
    { resourceId: "resource-2", sourceType: "pdf", lessonId: "lesson-1" },
  ];
  const replaceResourceChunks = jest.fn(
    async (
      next: ResourceKnowledgeSource,
      chunks: readonly DocumentChunk[],
      _vectors: readonly number[][],
      embeddingProvider: EmbeddingProvider,
    ) => {
      const deleted = resourceChunks.length;
      resourceChunks = chunks.map((chunk) => ({
        ...chunk,
        courseId: next.courseId,
        moduleId: next.moduleId,
        lessonId: next.lessonId,
        resourceId: next.resourceId,
        sourceTitle: next.title,
        embeddingModel: embeddingProvider.modelId,
        embeddingVersion: embeddingProvider.modelVersion,
        embeddedContentHash: chunk.contentHash,
      }));
      return deleted;
    },
  );
  const repository: ResourceIndexingRepository = {
    findResource: jest.fn(async () => source),
    listResourceChunks: jest.fn(async () => resourceChunks),
    replaceResourceChunks,
  };
  return {
    repository,
    replaceResourceChunks,
    chunks: () => resourceChunks,
    unrelated,
  };
}

describe("lesson resource indexing", () => {
  it("creates isolated PDF chunks with exact hierarchy metadata", async () => {
    const data = fixture();
    await indexLessonResource("resource-1", {
      repository: data.repository,
      provider: provider(),
    });
    expect(data.chunks()[0]).toMatchObject({
      courseId: "course-1",
      moduleId: "module-1",
      lessonId: "lesson-1",
      resourceId: "resource-1",
      sourceTitle: "Lecture PDF",
    });
    expect(data.unrelated).toEqual([
      { resourceId: null, sourceType: "lesson", lessonId: "lesson-1" },
      { resourceId: "resource-2", sourceType: "pdf", lessonId: "lesson-1" },
    ]);
  });

  it("is idempotent and does not re-embed unchanged content", async () => {
    const data = fixture();
    const embeddingProvider = provider();
    await indexLessonResource("resource-1", {
      repository: data.repository,
      provider: embeddingProvider,
    });
    embeddingProvider.embedPassages.mockClear();
    data.replaceResourceChunks.mockClear();
    const result = await indexLessonResource("resource-1", {
      repository: data.repository,
      provider: embeddingProvider,
    });
    expect(result.synchronized).toBe(true);
    expect(embeddingProvider.embedPassages).not.toHaveBeenCalled();
    expect(data.replaceResourceChunks).not.toHaveBeenCalled();
  });

  it("preserves old chunks when embedding fails", async () => {
    const data = fixture();
    const embeddingProvider = provider();
    await indexLessonResource("resource-1", {
      repository: data.repository,
      provider: embeddingProvider,
    });
    const old = [...data.chunks()];
    source.content = "Changed PDF material";
    embeddingProvider.embedPassages.mockRejectedValueOnce(new Error("offline"));
    await expect(
      indexLessonResource("resource-1", {
        repository: data.repository,
        provider: embeddingProvider,
      }),
    ).rejects.toThrow("offline");
    expect(data.chunks()).toEqual(old);
  });
});
