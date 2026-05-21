import type { FastifyInstance } from "fastify";
import { shotRegenerateSchema, videoGenerateSchema } from "@videopilot/shared";
import { prisma } from "../db/prisma";
import { enqueueGenerationJob } from "../services/queue";

export const registerVideoRoutes = async (app: FastifyInstance) => {
  app.post("/api/videos/generate", async (request, reply) => {
    const input = videoGenerateSchema.parse(request.body);
    const script = await prisma.script.findUniqueOrThrow({
      where: { id: input.scriptId },
      include: { shots: true }
    });
    const job = await prisma.generationJob.create({
      data: {
        type: "VIDEO_GENERATION",
        status: "QUEUED",
        progress: 0,
        productId: input.productId,
        scriptId: script.id,
        input,
        trace: [
          {
            at: new Date().toISOString(),
            stage: "queue",
            message: "Video generation job queued."
          }
        ]
      }
    });
    await enqueueGenerationJob("video-generation", { jobId: job.id, ...input });
    return reply.send({ data: job, requestId: request.id });
  });

  app.post("/api/videos/:id/shots/:shotId/regenerate", async (request, reply) => {
    const params = request.params as { id: string; shotId: string };
    const body = shotRegenerateSchema.parse({ ...(request.body as object), shotId: params.shotId });
    const script = await prisma.script.findUniqueOrThrow({ where: { id: params.id } });
    const job = await prisma.generationJob.create({
      data: {
        type: "SHOT_REGENERATION",
        status: "QUEUED",
        progress: 0,
        productId: script.productId,
        scriptId: script.id,
        input: body,
        trace: [
          {
            at: new Date().toISOString(),
            stage: "queue",
            message: "Shot regeneration queued."
          }
        ]
      }
    });
    await enqueueGenerationJob("shot-regeneration", {
      jobId: job.id,
      scriptId: script.id,
      ...body
    });
    return reply.send({ data: job, requestId: request.id });
  });

  app.get("/api/videos/exports", async (request, reply) => {
    const query = request.query as { scriptId?: string };
    const exports = await prisma.videoExport.findMany({
      where: { scriptId: query.scriptId },
      orderBy: { createdAt: "desc" }
    });
    return reply.send({ data: exports, requestId: request.id });
  });
};
