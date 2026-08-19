import { randomUUID } from "node:crypto";
import { Sequelize, QueryTypes } from "sequelize";
import {
  Course,
  KnowledgeChunk,
  Lesson,
  Module,
  User,
  initModels,
} from "@starter-kit/shared/db/models";
import type { EmbeddingProvider } from "../../src/services/ai/rag/embedding-provider";
import { semanticSearchCourse } from "../../src/services/ai/rag/course-retrieval.service";

const describePgvector =
  process.env.RUN_PGVECTOR_TESTS === "true" ? describe : describe.skip;

function vector(first: number, second: number): number[] {
  return [first, second, ...Array.from({ length: 382 }, () => 0)];
}

const provider: EmbeddingProvider = {
  modelId: "fixture-e5",
  modelVersion: "fixture-v1",
  dimension: 384,
  embedQuery: async () => vector(1, 0),
  embedPassage: async () => vector(1, 0),
  embedPassages: async (contents) => contents.map(() => vector(1, 0)),
};

describePgvector("course-scoped pgvector retrieval", () => {
  const database = new Sequelize(
    process.env.PGVECTOR_TEST_DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/starter_kit",
    { dialect: "postgres", logging: false },
  );
  const instructorIds: string[] = [];

  beforeAll(async () => {
    initModels(database);
    await database.authenticate();
  });

  afterAll(async () => {
    if (instructorIds.length > 0) {
      await User.destroy({ where: { id: instructorIds } });
    }
    await database.close();
  });

  it("ranks current embeddings and never returns another course", async () => {
    const extension = await database.query<{ extversion: string }>(
      "SELECT extversion FROM pg_extension WHERE extname = 'vector'",
      { type: QueryTypes.SELECT },
    );
    expect(extension[0]?.extversion).toMatch(/^0\.8\./u);

    const instructorId = randomUUID();
    instructorIds.push(instructorId);
    await User.create({
      id: instructorId,
      email: `${instructorId}@example.com`,
      passwordHash: "not-used-in-this-test",
      name: "Vector Test Instructor",
      role: "instructor",
    });

    const courseA = await Course.create({
      instructorId,
      title: "Course A",
      enrollmentCode: randomUUID(),
    });
    const courseB = await Course.create({
      instructorId,
      title: "Course B",
      enrollmentCode: randomUUID(),
    });
    const moduleA = await Module.create({ courseId: courseA.id, title: "A" });
    const moduleB = await Module.create({ courseId: courseB.id, title: "B" });
    const lessonA = await Lesson.create({
      moduleId: moduleA.id,
      title: "Authorized lesson",
      content: "alpha beta stale",
    });
    const lessonB = await Lesson.create({
      moduleId: moduleB.id,
      title: "Other course lesson",
      content: "private",
    });

    const hashes = ["a".repeat(64), "b".repeat(64), "c".repeat(64)];
    await KnowledgeChunk.bulkCreate([
      {
        courseId: courseA.id,
        moduleId: moduleA.id,
        lessonId: lessonA.id,
        sourceType: "lesson",
        sourceTitle: lessonA.title,
        chunkIndex: 0,
        content: "alpha",
        contentHash: hashes[0]!,
        startOffset: 0,
        endOffset: 5,
        embedding: vector(1, 0),
        embeddingModel: provider.modelId,
        embeddingVersion: provider.modelVersion,
        embeddedContentHash: hashes[0]!,
      },
      {
        courseId: courseA.id,
        moduleId: moduleA.id,
        lessonId: lessonA.id,
        sourceType: "lesson",
        sourceTitle: lessonA.title,
        chunkIndex: 1,
        content: "beta",
        contentHash: hashes[1]!,
        startOffset: 6,
        endOffset: 10,
        embedding: vector(0.8, 0.6),
        embeddingModel: provider.modelId,
        embeddingVersion: provider.modelVersion,
        embeddedContentHash: hashes[1]!,
      },
      {
        courseId: courseA.id,
        moduleId: moduleA.id,
        lessonId: lessonA.id,
        sourceType: "lesson",
        sourceTitle: lessonA.title,
        chunkIndex: 2,
        content: "stale",
        contentHash: hashes[2]!,
        startOffset: 11,
        endOffset: 16,
        embedding: vector(1, 0),
        embeddingModel: provider.modelId,
        embeddingVersion: provider.modelVersion,
        embeddedContentHash: "d".repeat(64),
      },
      {
        courseId: courseB.id,
        moduleId: moduleB.id,
        lessonId: lessonB.id,
        sourceType: "lesson",
        sourceTitle: lessonB.title,
        chunkIndex: 0,
        content: "other course private content",
        contentHash: "e".repeat(64),
        startOffset: 0,
        endOffset: 28,
        embedding: vector(1, 0),
        embeddingModel: provider.modelId,
        embeddingVersion: provider.modelVersion,
        embeddedContentHash: "e".repeat(64),
      },
    ]);

    const rows = await semanticSearchCourse(
      { courseId: courseA.id, query: "alpha", limit: 10 },
      { provider, database },
    );

    expect(rows.map((row) => row.excerpt)).toEqual(["alpha", "beta"]);
    expect(rows[0]?.similarity).toBeCloseTo(1);
    expect(rows[1]?.similarity).toBeCloseTo(0.8);
    expect(rows.every((row) => row.courseId === courseA.id)).toBe(true);
    expect(rows.map((row) => row.excerpt)).not.toContain("stale");
    expect(rows.map((row) => row.excerpt)).not.toContain(
      "other course private content",
    );
  });
});
