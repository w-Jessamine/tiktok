import type { FastifyInstance } from "fastify";
import { audioPreviewSchema } from "@videopilot/shared";

export const registerAudioRoutes = async (app: FastifyInstance) => {
  app.post("/api/audio/preview", async (request, reply) => {
    const input = audioPreviewSchema.parse(request.body);
    return reply.send({
      data: {
        provider: process.env.TTS_PROVIDER ?? "mock",
        status: "fallback",
        durationMs: input.durationMs,
        language: input.language,
        mood: input.mood,
        note: "Audio preview is synthesized during video rendering in the MVP fallback path."
      },
      requestId: request.id
    });
  });
};
