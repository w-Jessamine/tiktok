import { Worker } from "bullmq";
import IORedis from "ioredis";
import pino from "pino";
import { config } from "./config";
import { processAssetAnalysis } from "./processors/asset-analysis";
import { processShotRegeneration, processVideoGeneration } from "./processors/video-generation";
import { updateJob, appendTrace } from "./services/job-trace";

const logger = pino({ level: process.env.NODE_ENV === "production" ? "info" : "debug" });
const connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker(
  "generation",
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, "processing job");
    if (job.name === "asset-analysis") {
      await processAssetAnalysis(job.data as { jobId: string; assetId: string });
      return;
    }
    if (job.name === "video-generation") {
      await processVideoGeneration(
        job.data as {
          jobId: string;
          productId: string;
          scriptId: string;
          aspectRatio: "VERTICAL_9_16" | "HORIZONTAL_16_9";
        }
      );
      return;
    }
    if (job.name === "shot-regeneration") {
      await processShotRegeneration(
        job.data as {
          jobId: string;
          scriptId: string;
          shotId: string;
          prompt?: string;
          materialQuery?: string;
        }
      );
      return;
    }
    throw new Error(`Unknown job name: ${job.name}`);
  },
  { connection, concurrency: 3 }
);

worker.on("failed", async (job, error) => {
  logger.error({ jobId: job?.id, err: error }, "job failed");
  const domainJobId = job?.data?.jobId;
  if (typeof domainJobId === "string") {
    await appendTrace(domainJobId, "error", "Job failed and can be retried.", {
      message: error.message
    });
    await updateJob(domainJobId, {
      status: "RETRYABLE",
      progress: 0,
      error: error.message
    });
  }
});

logger.info("VideoPilot worker is running.");
