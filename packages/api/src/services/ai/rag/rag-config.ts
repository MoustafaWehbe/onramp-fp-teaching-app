import { EmbeddingConfigurationError } from "./embedding-provider";

export const DEFAULT_RAG_RETRIEVAL_LIMIT = 6;
export const MAX_RAG_RETRIEVAL_LIMIT = 10;
export const DEFAULT_RAG_MIN_SIMILARITY = 0.75;
export const DEFAULT_RAG_MAX_SOURCE_CHARACTERS = 1_500;
export const DEFAULT_RAG_MAX_CONTEXT_CHARACTERS = 8_000;

export interface CourseRagConfig {
  retrievalLimit: number;
  minimumSimilarity: number;
  maximumSourceCharacters: number;
  maximumContextCharacters: number;
}

function integer(
  raw: string | undefined,
  name: string,
  defaultValue: number,
  minimum: number,
  maximum: number,
): number {
  if (raw === undefined || raw.trim() === "") return defaultValue;
  if (!/^\d+$/u.test(raw.trim())) {
    throw new EmbeddingConfigurationError(
      `${name} must be an integer from ${minimum} through ${maximum}`,
    );
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new EmbeddingConfigurationError(
      `${name} must be an integer from ${minimum} through ${maximum}`,
    );
  }
  return value;
}

function similarityThreshold(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_RAG_MIN_SIMILARITY;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < -1 || value > 1) {
    throw new EmbeddingConfigurationError(
      "RAG_MIN_SIMILARITY must be a finite number from -1 through 1",
    );
  }
  return value;
}

export function loadCourseRagConfig(
  environment: NodeJS.ProcessEnv = process.env,
): CourseRagConfig {
  const maximumSourceCharacters = integer(
    environment.RAG_MAX_SOURCE_CHARACTERS,
    "RAG_MAX_SOURCE_CHARACTERS",
    DEFAULT_RAG_MAX_SOURCE_CHARACTERS,
    100,
    10_000,
  );
  const maximumContextCharacters = integer(
    environment.RAG_MAX_CONTEXT_CHARS ?? environment.RAG_MAX_CONTEXT_CHARACTERS,
    "RAG_MAX_CONTEXT_CHARS",
    DEFAULT_RAG_MAX_CONTEXT_CHARACTERS,
    500,
    50_000,
  );
  if (maximumSourceCharacters > maximumContextCharacters) {
    throw new EmbeddingConfigurationError(
      "RAG_MAX_SOURCE_CHARACTERS must not exceed RAG_MAX_CONTEXT_CHARS",
    );
  }

  return {
    retrievalLimit: integer(
      environment.RAG_RETRIEVAL_LIMIT,
      "RAG_RETRIEVAL_LIMIT",
      DEFAULT_RAG_RETRIEVAL_LIMIT,
      1,
      MAX_RAG_RETRIEVAL_LIMIT,
    ),
    minimumSimilarity: similarityThreshold(environment.RAG_MIN_SIMILARITY),
    maximumSourceCharacters,
    maximumContextCharacters,
  };
}
