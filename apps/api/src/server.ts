import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import staticPlugin from "@fastify/static";
import Fastify from "fastify";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { storageRoot } from "./services/paths";
import { config } from "./config";
import { registerAnalyticsRoutes } from "./routes/analytics";
import { registerAssetRoutes } from "./routes/assets";
import { registerAudioRoutes } from "./routes/audio";
import { registerComplianceRoutes } from "./routes/compliance";
import { registerJobRoutes } from "./routes/jobs";
import { registerProductRoutes } from "./routes/products";
import { registerScriptRoutes } from "./routes/scripts";
import { registerVideoRoutes } from "./routes/videos";

const infrastructureError = (error: Error & { code?: string }) => {
  const message = error.message ?? "";
  if (
    error.name === "PrismaClientInitializationError" ||
    message.includes("Environment variable not found: DATABASE_URL") ||
    message.includes("Can't reach database server")
  ) {
    return {
      statusCode: 503,
      code: "DATABASE_UNAVAILABLE",
      message:
        "Database is not configured or reachable. Set DATABASE_URL, start PostgreSQL, and run prisma db push/seed before using data-backed APIs."
    };
  }
  return null;
};

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
  await mkdir(storageRoot, { recursive: true });
  await app.register(staticPlugin, {
    root: storageRoot,
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
    const infrastructure = infrastructureError(error);
    reply.status(infrastructure?.statusCode ?? error.statusCode ?? 500).send({
      error: {
        message: infrastructure?.message ?? error.message,
        code: infrastructure?.code ?? error.code ?? "INTERNAL_ERROR"
      },
      requestId: request.id
    });
  });

  return app;
};

const isMain = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMain) {
  const app = await buildApp();
  await app.listen({ port: config.PORT, host: "0.0.0.0" });
}
