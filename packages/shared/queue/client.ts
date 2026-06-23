import { Queue } from "bullmq";
import IORedis from "ioredis";
import {
  QUEUE_NAMES,
  type EmailJobData,
  type EmbeddingsJobData,
} from "./types";

let redisConnection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!redisConnection) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    redisConnection = new IORedis(url, {
      maxRetriesPerRequest: null, // required by BullMQ
    });
  }
  return redisConnection;
}

function createQueue<T>(name: string): Queue<T> {
  return new Queue<T>(name, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  });
}

export const emailQueue = createQueue<EmailJobData>(QUEUE_NAMES.EMAIL);
export const embeddingsQueue = createQueue<EmbeddingsJobData>(
  QUEUE_NAMES.EMBEDDINGS,
);
