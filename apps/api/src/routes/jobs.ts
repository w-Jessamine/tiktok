import type { FastifyInstance } from "fastify";
import { prisma } from "../db/prisma";
import { enqueueGenerationJob } from "../services/queue";
import { serializeJob } from "../services/serialize";

export const registerJobRoutes = async (app: FastifyInstance) => {
  app.get("/api/jobs/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: params.id } });
    return reply.send({ data: serializeJob(job), requestId: request.id });
  });

  app.get("/api/jobs/:id/events", async (request, reply) => {
    const params = request.params as { id: string };
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });
    const timer = setInterval(async () => {
      const job = await prisma.generationJob.findUnique({ where: { id: params.id } });
      if (!job) {
        reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: "job not found" })}\n\n`);
        clearInterval(timer);
        reply.raw.end();
        return;
      }
      reply.raw.write(`data: ${JSON.stringify(serializeJob(job))}\n\n`);
      if (["COMPLETED", "FAILED", "RETRYABLE"].includes(job.status)) {
        clearInterval(timer);
        reply.raw.end();
      }
    }, 1000);
    request.raw.on("close", () => clearInterval(timer));
  });

  app.post("/api/jobs/:id/retry", async (request, reply) => {
    const params = request.params as { id: string };
    const job = await prisma.generationJob.update({
      where: { id: params.id },
      data: {
        status: "QUEUED",
        progress: 0,
        retryCount: { increment: 1 },
        error: null
      }
    });
    const input = job.input as Record<string, unknown>;
    const queueName =
      job.type === "ASSET_ANALYSIS"
        ? "asset-analysis"
        : job.type === "SCRIPT_GENERATION"
          ? "script-generation"
          : job.type === "SHOT_REGENERATION"
            ? "shot-regeneration"
            : "video-generation";
    await enqueueGenerationJob(queueName, { ...input, jobId: job.id });
    return reply.send({ data: serializeJob(job), requestId: request.id });
  });
};
