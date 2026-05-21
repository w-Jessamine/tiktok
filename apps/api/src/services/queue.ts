import { Queue } from "bullmq";
import IORedis from "ioredis";
import { config } from "../config";

export const connection = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null
});

export const generationQueue = new Queue("generation", { connection });

export type QueueJobName =
  | "asset-analysis"
  | "script-generation"
  | "video-generation"
  | "shot-regeneration";

export const enqueueGenerationJob = async (name: QueueJobName, data: Record<string, unknown>) => {
  return generationQueue.add(name, data, {
    attempts: 2,
    backoff: { type: "exponential", delay: 1500 },
    removeOnComplete: 100,
    removeOnFail: 100
  });
};
