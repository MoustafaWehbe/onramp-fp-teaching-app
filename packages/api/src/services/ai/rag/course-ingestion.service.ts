import { KnowledgeChunk } from "@starter-kit/shared/db/models/KnowledgeChunk";
import { Lesson } from "@starter-kit/shared/db/models/Lesson";
import { Module } from "@starter-kit/shared/db/models/Module";
import type { Transaction } from "sequelize";
import { chunkText, type DocumentChunk } from "./chunk-text";
import { E5_EMBEDDING_DIMENSION, getEmbeddingProvider } from "./e5-provider";
import {
  EmbeddingConfigurationError,
  type EmbeddingProvider,
} from "./embedding-provider";
import { normalizeEmbedding } from "./vector";

export interface LessonKnowledgeSource {
  lessonId: string;
  moduleId: string;
  courseId: string;
  title: string;
  content: string;
}

export interface PersistedLessonChunk extends DocumentChunk {
  courseId: string;
  moduleId: string | null;
  lessonId: string | null;
  sourceTitle: string;
  embeddingModel: string;
  embeddingVersion: string;
  embeddedContentHash: string;
}

export interface CourseIngestionRepository {
  findLesson(lessonId: string): Promise<LessonKnowledgeSource | null>;
  listCourseLessonIds(courseId: string): Promise<string[]>;
  listLessonChunks(lessonId: string): Promise<PersistedLessonChunk[]>;
  replaceLessonChunks(
    source: LessonKnowledgeSource,
    chunks: readonly DocumentChunk[],
    embeddings: readonly number[][],
    provider: EmbeddingProvider,
  ): Promise<number>;
  deleteLessonChunks(lessonId: string): Promise<number>;
}

export interface LessonIndexSummary {
  lessonId: string;
  synchronized: boolean;
  created: number;
  retained: number;
  deletedOrReplaced: number;
}

export interface CourseIndexSummary {
  courseId: string;
  lessonsInspected: number;
  lessonsChanged: number;
  chunksCreated: number;
  chunksRetained: number;
  chunksDeletedOrReplaced: number;
}

function normalizeLessonContent(content: string): string {
  return content.replace(/\r\n?/gu, "\n").trim();
}

function chunksMatch(
  persisted: readonly PersistedLessonChunk[],
  expected: readonly DocumentChunk[],
  source: LessonKnowledgeSource,
  provider: EmbeddingProvider,
): boolean {
  return (
    persisted.length === expected.length &&
    persisted.every((current, index) => {
      const next = expected[index];
      return (
        next !== undefined &&
        current.courseId === source.courseId &&
        current.moduleId === source.moduleId &&
        current.lessonId === source.lessonId &&
        current.sourceTitle === source.title &&
        current.chunkIndex === next.chunkIndex &&
        current.content === next.content &&
        current.contentHash === next.contentHash &&
        current.startOffset === next.startOffset &&
        current.endOffset === next.endOffset &&
        current.embeddingModel === provider.modelId &&
        current.embeddingVersion === provider.modelVersion &&
        current.embeddedContentHash === next.contentHash
      );
    })
  );
}

function requireCompatibleProvider(provider: EmbeddingProvider): void {
  if (provider.dimension !== E5_EMBEDDING_DIMENSION) {
    throw new EmbeddingConfigurationError(
      `Active provider dimension ${provider.dimension} does not match database vector dimension ${E5_EMBEDDING_DIMENSION}`,
    );
  }
}

export function createCourseIngestionRepository(): CourseIngestionRepository {
  return {
    async findLesson(lessonId) {
      const lesson = (await Lesson.findByPk(lessonId, {
        include: [
          {
            model: Module,
            as: "module",
            attributes: ["id", "courseId"],
            required: true,
          },
        ],
      })) as (Lesson & { module?: Module }) | null;
      if (!lesson?.module) return null;

      return {
        lessonId: lesson.id,
        moduleId: lesson.module.id,
        courseId: lesson.module.courseId,
        title: lesson.title,
        content: lesson.content ?? "",
      };
    },

    async listCourseLessonIds(courseId) {
      const lessons = await Lesson.findAll({
        attributes: ["id"],
        include: [
          {
            model: Module,
            as: "module",
            attributes: [],
            required: true,
            where: { courseId },
          },
        ],
        order: [["id", "ASC"]],
      });
      return lessons.map((lesson) => lesson.id);
    },

    async listLessonChunks(lessonId) {
      const chunks = await KnowledgeChunk.findAll({
        where: { lessonId, resourceId: null, sourceType: "lesson" },
        order: [["chunkIndex", "ASC"]],
      });
      return chunks.map((chunk) => ({
        courseId: chunk.courseId,
        moduleId: chunk.moduleId,
        lessonId: chunk.lessonId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        contentHash: chunk.contentHash,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        sourceTitle: chunk.sourceTitle,
        embeddingModel: chunk.embeddingModel,
        embeddingVersion: chunk.embeddingVersion,
        embeddedContentHash: chunk.embeddedContentHash,
      }));
    },

    async replaceLessonChunks(source, chunks, embeddings, provider) {
      const sequelize = KnowledgeChunk.sequelize;
      if (!sequelize)
        throw new Error("KnowledgeChunk model is not initialized");

      return sequelize.transaction(async (transaction: Transaction) => {
        const lockedLesson = await Lesson.findByPk(source.lessonId, {
          attributes: ["id"],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!lockedLesson) throw new Error("Lesson no longer exists");

        const deleted = await KnowledgeChunk.destroy({
          where: {
            lessonId: source.lessonId,
            resourceId: null,
            sourceType: "lesson",
          },
          transaction,
        });
        if (chunks.length > 0) {
          await KnowledgeChunk.bulkCreate(
            chunks.map((chunk, index) => ({
              courseId: source.courseId,
              moduleId: source.moduleId,
              lessonId: source.lessonId,
              resourceId: null,
              sourceType: "lesson" as const,
              sourceTitle: source.title,
              chunkIndex: chunk.chunkIndex,
              content: chunk.content,
              contentHash: chunk.contentHash,
              startOffset: chunk.startOffset,
              endOffset: chunk.endOffset,
              embedding: embeddings[index]!,
              embeddingModel: provider.modelId,
              embeddingVersion: provider.modelVersion,
              embeddedContentHash: chunk.contentHash,
            })),
            { transaction },
          );
        }
        return deleted;
      });
    },

    deleteLessonChunks: async (lessonId) =>
      KnowledgeChunk.destroy({
        where: { lessonId, resourceId: null, sourceType: "lesson" },
      }),
  };
}

export interface CourseIngestionDependencies {
  provider?: EmbeddingProvider;
  repository?: CourseIngestionRepository;
}

export async function indexLesson(
  lessonId: string,
  dependencies: CourseIngestionDependencies = {},
): Promise<LessonIndexSummary> {
  const provider = dependencies.provider ?? getEmbeddingProvider();
  const repository =
    dependencies.repository ?? createCourseIngestionRepository();
  requireCompatibleProvider(provider);

  const source = await repository.findLesson(lessonId);
  if (!source) throw new Error("Lesson not found for knowledge indexing");

  const normalizedSource = {
    ...source,
    content: normalizeLessonContent(source.content),
  };
  const expected = chunkText(normalizedSource.content);
  const persisted = await repository.listLessonChunks(lessonId);
  if (chunksMatch(persisted, expected, source, provider)) {
    return {
      lessonId,
      synchronized: true,
      created: 0,
      retained: persisted.length,
      deletedOrReplaced: 0,
    };
  }

  const generated = await provider.embedPassages(
    expected.map((chunk) => chunk.content),
  );
  if (generated.length !== expected.length) {
    throw new Error(
      `Embedding provider returned ${generated.length} vectors for ${expected.length} chunks`,
    );
  }
  const embeddings = generated.map((embedding) =>
    normalizeEmbedding(embedding, E5_EMBEDDING_DIMENSION),
  );

  const deleted = await repository.replaceLessonChunks(
    normalizedSource,
    expected,
    embeddings,
    provider,
  );
  return {
    lessonId,
    synchronized: false,
    created: expected.length,
    retained: 0,
    deletedOrReplaced: deleted,
  };
}

const courseIndexFlights = new Map<string, Promise<CourseIndexSummary>>();

async function performCourseIndex(
  courseId: string,
  dependencies: CourseIngestionDependencies = {},
): Promise<CourseIndexSummary> {
  const repository =
    dependencies.repository ?? createCourseIngestionRepository();
  const lessonIds = await repository.listCourseLessonIds(courseId);
  const summary: CourseIndexSummary = {
    courseId,
    lessonsInspected: lessonIds.length,
    lessonsChanged: 0,
    chunksCreated: 0,
    chunksRetained: 0,
    chunksDeletedOrReplaced: 0,
  };

  for (const lessonId of lessonIds) {
    const lesson = await indexLesson(lessonId, {
      ...dependencies,
      repository,
    });
    if (!lesson.synchronized) summary.lessonsChanged += 1;
    summary.chunksCreated += lesson.created;
    summary.chunksRetained += lesson.retained;
    summary.chunksDeletedOrReplaced += lesson.deletedOrReplaced;
  }

  return summary;
}

export function indexCourse(
  courseId: string,
  dependencies: CourseIngestionDependencies = {},
): Promise<CourseIndexSummary> {
  const currentFlight = courseIndexFlights.get(courseId);
  if (currentFlight) return currentFlight;

  // Each completed call still scans lesson metadata/chunk hashes for freshness.
  // indexLesson skips embedding unchanged content, while this single-flight map
  // prevents concurrent assistant requests from duplicating that work.
  const nextFlight = performCourseIndex(courseId, dependencies);
  courseIndexFlights.set(courseId, nextFlight);
  const clearFlight = () => {
    if (courseIndexFlights.get(courseId) === nextFlight) {
      courseIndexFlights.delete(courseId);
    }
  };
  void nextFlight.then(clearFlight, clearFlight);
  return nextFlight;
}
