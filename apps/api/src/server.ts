import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import staticPlugin from "@fastify/static";
import Fastify from "fastify";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "./config";
import { registerAnalyticsRoutes } from "./routes/analytics";
import { registerAssetRoutes } from "./routes/assets";
import { registerAudioRoutes } from "./routes/audio";
import { registerComplianceRoutes } from "./routes/compliance";
import { registerJobRoutes } from "./routes/jobs";
import { registerProductRoutes } from "./routes/products";
import { registerScriptRoutes } from "./routes/scripts";
import { registerVideoRoutes } from "./routes/videos";

export const buildApp = async () => {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === "production" ? "info" : "debug",
      redact: ["req.headers.authorization", "*.ARK_API_KEY", "*.apiKey"]
    },
    genReqId: () => randomUUID()
  });

  app.decorateReply("badRequest", function badRequest(message: string) {
    return this.code(400).send({ error: { message }, requestId: this.request.id });
  });

  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 200 * 1024 * 1024 } });
  await app.register(staticPlugin, {
    root: path.resolve(process.cwd(), "storage"),
    prefix: "/storage/"
  });

  app.get("/health", async () => ({ ok: true, service: "videopilot-api" }));

  await registerProductRoutes(app);
  await registerAssetRoutes(app);
  await registerScriptRoutes(app);
  await registerVideoRoutes(app);
  await registerAudioRoutes(app);
  await registerComplianceRoutes(app);
  await registerJobRoutes(app);
  await registerAnalyticsRoutes(app);

  app.setErrorHandler((error: Error & { statusCode?: number; code?: string }, request, reply) => {
    request.log.error({ err: error }, "request failed");
    reply.status(error.statusCode ?? 500).send({
      error: {
        message: error.message,
        code: error.code ?? "INTERNAL_ERROR"
      },
      requestId: request.id
    });
  });

  return app;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await buildApp();
  await app.listen({ port: config.PORT, host: "0.0.0.0" });
}
