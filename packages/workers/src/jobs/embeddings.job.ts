import type { Job } from "bullmq";
import type {
  EmbeddingsJobData,
  EmbeddingsJobResult,
} from "@starter-kit/shared";
import { generateEmbedding } from "../lib/ai";

export async function processEmbeddingsJob(
  job: Job<EmbeddingsJobData, EmbeddingsJobResult>,
): Promise<EmbeddingsJobResult> {
  const { entityId, entityType, text } = job.data;

  console.info(
    `[embeddings] Generating embedding for ${entityType}:${entityId}`,
  );

  const embedding = await generateEmbedding(text);

  // TODO: store the embedding vector in your database
  // e.g., using pgvector:
  // await YourModel.update({ embedding }, { where: { id: entityId } });

  console.info(
    `[embeddings] Generated ${embedding.length}-dim vector for ${entityType}:${entityId}`,
  );

  return { dimensions: embedding.length };
}
