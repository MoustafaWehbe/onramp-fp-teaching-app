import type { Sequelize } from "sequelize";
import {
  semanticSearchCourse,
  type CourseSemanticSearchResult,
} from "../../src/services/ai/rag/course-retrieval.service";
import type { EmbeddingProvider } from "../../src/services/ai/rag/embedding-provider";

const courseA = "00000000-0000-4000-8000-00000000000a";
const courseB = "00000000-0000-4000-8000-00000000000b";

function vector(value = 1): number[] {
  return [value, ...Array.from({ length: 383 }, () => 0)];
}

function provider(
  overrides: Partial<EmbeddingProvider> = {},
): EmbeddingProvider {
  return {
    modelId: "fixture-e5",
    modelVersion: "fixture-v1",
    dimension: 384,
    embedPassage: jest.fn(async () => vector()),
    embedPassages: jest.fn(async (values) => values.map(() => vector())),
    embedQuery: jest.fn(async () => vector(2)),
    ...overrides,
  };
}

function result(courseId = courseA): CourseSemanticSearchResult {
  return {
    chunkId: "00000000-0000-4000-8000-000000000001",
    courseId,
    moduleId: "00000000-0000-4000-8000-000000000002",
    lessonId: "00000000-0000-4000-8000-000000000003",
    sourceType: "lesson",
    sourceTitle: "React Query Fundamentals",
    chunkIndex: 0,
    excerpt: "Query invalidation marks cached data stale.",
    similarity: 0.91,
  };
}

function databaseReturning(rows: CourseSemanticSearchResult[]) {
  const query = jest.fn().mockResolvedValue(rows);
  return {
    query,
    database: { query } as unknown as Pick<Sequelize, "query">,
  };
}

describe("semanticSearchCourse", () => {
  it("returns ranked course chunks without exposing vectors", async () => {
    const fixture = databaseReturning([result()]);

    await expect(
      semanticSearchCourse(
        { courseId: courseA, query: "What is invalidation?", limit: 6 },
        { provider: provider(), database: fixture.database },
      ),
    ).resolves.toEqual([result()]);
    expect(JSON.stringify(result())).not.toContain("embedding");
  });

  it("filters by course inside parameterized SQL", async () => {
    const fixture = databaseReturning([]);

    await semanticSearchCourse(
      { courseId: courseA, query: "Question", limit: 6 },
      { provider: provider(), database: fixture.database },
    );

    const [sql, options] = fixture.query.mock.calls[0]!;
    expect(sql).toContain('WHERE chunk."course_id" = CAST(:courseId AS uuid)');
    expect(sql).not.toContain(courseA);
    expect(options.replacements).toMatchObject({
      courseId: courseA,
      embeddingModel: "fixture-e5",
      embeddingVersion: "fixture-v1",
      limit: 6,
    });
  });

  it("cannot turn a Course A request into a Course B database filter", async () => {
    const query = jest.fn(async (_sql: string, options: any) =>
      options.replacements.courseId === courseA ? [result(courseA)] : [],
    );
    const database = { query } as unknown as Pick<Sequelize, "query">;

    const rows = await semanticSearchCourse(
      { courseId: courseA, query: "Question", limit: 6 },
      { provider: provider(), database },
    );

    expect(rows).toEqual([expect.objectContaining({ courseId: courseA })]);
    expect(rows).not.toContainEqual(
      expect.objectContaining({ courseId: courseB }),
    );
  });

  it("excludes missing, stale, and wrong-model embeddings in SQL", async () => {
    const fixture = databaseReturning([]);

    await semanticSearchCourse(
      { courseId: courseA, query: "Question", limit: 3 },
      { provider: provider(), database: fixture.database },
    );

    const sql = fixture.query.mock.calls[0]?.[0] as string;
    expect(sql).toContain('chunk."embedding" IS NOT NULL');
    expect(sql).toContain('chunk."embedding_model" = :embeddingModel');
    expect(sql).toContain('chunk."embedding_version" = :embeddingVersion');
    expect(sql).toContain(
      'chunk."embedded_content_hash" = chunk."content_hash"',
    );
    expect(sql).toContain("<=>");
  });

  it("normalizes the query embedding before SQL serialization", async () => {
    const fixture = databaseReturning([]);

    await semanticSearchCourse(
      { courseId: courseA, query: "Question", limit: 1 },
      { provider: provider(), database: fixture.database },
    );

    expect(fixture.query.mock.calls[0]?.[1].replacements.queryVector).toBe(
      `[1,${Array.from({ length: 383 }, () => 0).join(",")}]`,
    );
  });

  it("rejects incompatible dimensions and invalid limits before querying", async () => {
    const fixture = databaseReturning([]);

    await expect(
      semanticSearchCourse(
        { courseId: courseA, query: "Question", limit: 6 },
        { provider: provider({ dimension: 3 }), database: fixture.database },
      ),
    ).rejects.toThrow(/dimension/u);
    await expect(
      semanticSearchCourse(
        { courseId: courseA, query: "Question", limit: 11 },
        { provider: provider(), database: fixture.database },
      ),
    ).rejects.toThrow(RangeError);
    expect(fixture.query).not.toHaveBeenCalled();
  });
});
