import { KnowledgeChunk } from "@starter-kit/shared/db/models/KnowledgeChunk";
import { Lesson } from "@starter-kit/shared/db/models/Lesson";
import { LessonResource } from "@starter-kit/shared/db/models/LessonResource";
import { Module } from "@starter-kit/shared/db/models/Module";
import type { Transaction } from "sequelize";
import { chunkText, type DocumentChunk } from "./chunk-text";
import { E5_EMBEDDING_DIMENSION, getEmbeddingProvider } from "./e5-provider";
import {
  EmbeddingConfigurationError,
  type EmbeddingProvider,
} from "./embedding-provider";
import { normalizeEmbedding } from "./vector";

export interface ResourceKnowledgeSource {
  resourceId: string;
  lessonId: string;
  moduleId: string;
  courseId: string;
  title: string;
  content: string;
}

interface ResourceChunk extends DocumentChunk {
  courseId: string;
  moduleId: string | null;
  lessonId: string | null;
  resourceId: string | null;
  sourceTitle: string;
  embeddingModel: string;
  embeddingVersion: string;
  embeddedContentHash: string;
}

export interface ResourceIndexingRepository {
  findResource(id: string): Promise<ResourceKnowledgeSource | null>;
  listResourceChunks(id: string): Promise<ResourceChunk[]>;
  replaceResourceChunks(
    source: ResourceKnowledgeSource,
    chunks: readonly DocumentChunk[],
    embeddings: readonly number[][],
    provider: EmbeddingProvider,
  ): Promise<number>;
}

function chunksMatch(
  current: readonly ResourceChunk[],
  expected: readonly DocumentChunk[],
  source: ResourceKnowledgeSource,
  provider: EmbeddingProvider,
): boolean {
  return (
    current.length === expected.length &&
    current.every((chunk, index) => {
      const next = expected[index];
      return (
        next !== undefined &&
        chunk.courseId === source.courseId &&
        chunk.moduleId === source.moduleId &&
        chunk.lessonId === source.lessonId &&
        chunk.resourceId === source.resourceId &&
        chunk.sourceTitle === source.title &&
        chunk.chunkIndex === next.chunkIndex &&
        chunk.content === next.content &&
        chunk.contentHash === next.contentHash &&
        chunk.startOffset === next.startOffset &&
        chunk.endOffset === next.endOffset &&
        chunk.embeddingModel === provider.modelId &&
        chunk.embeddingVersion === provider.modelVersion &&
        chunk.embeddedContentHash === next.contentHash
      );
    })
  );
}

export function createResourceIndexingRepository(): ResourceIndexingRepository {
  return {
    async findResource(id) {
      const resource =
        await LessonResource.scope("withExtractedText").findByPk(id);
      if (!resource?.extractedText) return null;
      const lesson = await Lesson.findByPk(resource.lessonId);
      if (!lesson) return null;
      const module = await Module.findByPk(lesson.moduleId);
      if (!module) return null;
      return {
        resourceId: resource.id,
        lessonId: lesson.id,
        moduleId: module.id,
        courseId: module.courseId,
        title: resource.title || resource.originalFileName,
        content: resource.extractedText.replace(/\r\n?/gu, "\n").trim(),
      };
    },
    async listResourceChunks(resourceId) {
      const chunks = await KnowledgeChunk.findAll({
        where: { resourceId },
        order: [["chunkIndex", "ASC"]],
      });
      return chunks.map((chunk) => ({
        courseId: chunk.courseId,
        moduleId: chunk.moduleId,
        lessonId: chunk.lessonId,
        resourceId: chunk.resourceId,
        sourceTitle: chunk.sourceTitle,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        contentHash: chunk.contentHash,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        embeddingModel: chunk.embeddingModel,
        embeddingVersion: chunk.embeddingVersion,
        embeddedContentHash: chunk.embeddedContentHash,
      }));
    },
    async replaceResourceChunks(source, chunks, embeddings, provider) {
      const sequelize = KnowledgeChunk.sequelize;
      if (!sequelize)
        throw new Error("KnowledgeChunk model is not initialized");
      return sequelize.transaction(async (transaction: Transaction) => {
        const resource = await LessonResource.findByPk(source.resourceId, {
          attributes: ["id"],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!resource) throw new Error("Lesson resource no longer exists");
        const deleted = await KnowledgeChunk.destroy({
          where: { resourceId: source.resourceId },
          transaction,
        });
        await KnowledgeChunk.bulkCreate(
          chunks.map((chunk, index) => ({
            courseId: source.courseId,
            moduleId: source.moduleId,
            lessonId: source.lessonId,
            resourceId: source.resourceId,
            sourceType: "pdf" as const,
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
        return deleted;
      });
    },
  };
}

export async function indexLessonResource(
  resourceId: string,
  dependencies: {
    provider?: EmbeddingProvider;
    repository?: ResourceIndexingRepository;
  } = {},
) {
  const provider = dependencies.provider ?? getEmbeddingProvider();
  if (provider.dimension !== E5_EMBEDDING_DIMENSION) {
    throw new EmbeddingConfigurationError(
      "Active embedding provider does not match the database vector dimension",
    );
  }
  const repository =
    dependencies.repository ?? createResourceIndexingRepository();
  const source = await repository.findResource(resourceId);
  if (!source)
    throw new Error("Lesson resource not found for knowledge indexing");
  const expected = chunkText(source.content);
  const current = await repository.listResourceChunks(resourceId);
  if (chunksMatch(current, expected, source, provider)) {
    return {
      resourceId,
      synchronized: true,
      created: 0,
      retained: current.length,
      deletedOrReplaced: 0,
    };
  }
  const generated = await provider.embedPassages(
    expected.map((chunk) => chunk.content),
  );
  if (generated.length !== expected.length)
    throw new Error("Embedding provider returned an invalid result");
  const embeddings = generated.map((value) =>
    normalizeEmbedding(value, E5_EMBEDDING_DIMENSION),
  );
  const deleted = await repository.replaceResourceChunks(
    source,
    expected,
    embeddings,
    provider,
  );
  return {
    resourceId,
    synchronized: false,
    created: expected.length,
    retained: 0,
    deletedOrReplaced: deleted,
  };
}
