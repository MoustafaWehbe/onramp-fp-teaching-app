import type { Sequelize } from "sequelize";
import { QueryTypes } from "sequelize";
import { getDatabase } from "../../../lib/db";
import { E5_EMBEDDING_DIMENSION, getEmbeddingProvider } from "./e5-provider";
import {
  EmbeddingConfigurationError,
  type EmbeddingProvider,
} from "./embedding-provider";
import { embeddingToSqlVector, normalizeEmbedding } from "./vector";

export const COURSE_SEARCH_EXCERPT_LENGTH = 1_500;

export interface CourseSemanticSearchResult {
  chunkId: string;
  courseId: string;
  moduleId: string | null;
  lessonId: string | null;
  sourceType: "lesson" | "text" | "pdf";
  sourceTitle: string;
  chunkIndex: number;
  excerpt: string;
  similarity: number;
}

export interface SemanticSearchCourseOptions {
  courseId: string;
  query: string;
  limit: number;
}

export interface CourseRetrievalDependencies {
  provider?: EmbeddingProvider;
  database?: Pick<Sequelize, "query">;
}

export async function semanticSearchCourse(
  options: SemanticSearchCourseOptions,
  dependencies: CourseRetrievalDependencies = {},
): Promise<CourseSemanticSearchResult[]> {
  const provider = dependencies.provider ?? getEmbeddingProvider();
  if (provider.dimension !== E5_EMBEDDING_DIMENSION) {
    throw new EmbeddingConfigurationError(
      `Active provider dimension ${provider.dimension} does not match database vector dimension ${E5_EMBEDDING_DIMENSION}`,
    );
  }
  if (
    !Number.isInteger(options.limit) ||
    options.limit < 1 ||
    options.limit > 10
  ) {
    throw new RangeError(
      "Course retrieval limit must be an integer from 1 through 10",
    );
  }

  const queryVector = embeddingToSqlVector(
    normalizeEmbedding(
      await provider.embedQuery(options.query),
      E5_EMBEDDING_DIMENSION,
    ),
  );
  const database = dependencies.database ?? getDatabase();

  return database.query<CourseSemanticSearchResult>(
    `
      SELECT
        chunk."id" AS "chunkId",
        chunk."course_id" AS "courseId",
        chunk."module_id" AS "moduleId",
        chunk."lesson_id" AS "lessonId",
        chunk."source_type" AS "sourceType",
        chunk."source_title" AS "sourceTitle",
        chunk."chunk_index" AS "chunkIndex",
        LEFT(chunk."content", :excerptLength) AS "excerpt",
        (
          1 - (
            chunk."embedding" <=> CAST(:queryVector AS vector)
          )
        )::double precision AS "similarity"
      FROM "knowledge_chunks" AS chunk
      WHERE chunk."course_id" = CAST(:courseId AS uuid)
        AND chunk."embedding" IS NOT NULL
        AND chunk."embedding_model" = :embeddingModel
        AND chunk."embedding_version" = :embeddingVersion
        AND chunk."embedded_content_hash" = chunk."content_hash"
      ORDER BY
        chunk."embedding" <=> CAST(:queryVector AS vector) ASC,
        chunk."id" ASC
      LIMIT :limit
    `,
    {
      replacements: {
        courseId: options.courseId,
        queryVector,
        embeddingModel: provider.modelId,
        embeddingVersion: provider.modelVersion,
        excerptLength: COURSE_SEARCH_EXCERPT_LENGTH,
        limit: options.limit,
      },
      type: QueryTypes.SELECT,
    },
  );
}
