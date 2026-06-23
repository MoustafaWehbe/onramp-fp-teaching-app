import { getAIClient } from "./client";

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getAIClient();
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0]?.embedding ?? [];
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const client = getAIClient();
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length)
    throw new Error("Vectors must have the same length");
  const dot = a.reduce((sum, ai, i) => sum + ai * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}
