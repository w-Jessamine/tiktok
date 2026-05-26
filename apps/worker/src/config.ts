import { z } from "zod";

const envSchema = z.object({
  REDIS_URL: z.string().default("redis://localhost:6379"),
  LOCAL_PUBLIC_STORAGE_URL: z.string().default("/storage"),
  WORKER_OUTPUT_DIR: z.string().default("storage/generated"),
  AI_PROVIDER: z.enum(["mock", "ark", "hybrid"]).default("hybrid"),
  ARK_API_KEY: z.string().optional(),
  ARK_TEXT_MODEL: z.string().optional(),
  ARK_VIDEO_MODEL: z.string().optional(),
  TTS_PROVIDER: z.enum(["mock", "ark", "hybrid"]).default("mock"),
  BGM_PROVIDER: z.enum(["mock", "local"]).default("mock"),
  ARK_VIDEO_DEBUG_SAMPLE: z.coerce.boolean().default(false)
});

export const config = envSchema.parse(process.env);

export const getAiRuntimeDiagnostics = () => ({
  provider: config.AI_PROVIDER,
  hasArkKey: Boolean(config.ARK_API_KEY),
  hasTextModel: Boolean(config.ARK_TEXT_MODEL),
  hasVideoModel: Boolean(config.ARK_VIDEO_MODEL),
  videoMode:
    config.AI_PROVIDER === "ark" || config.AI_PROVIDER === "hybrid"
      ? config.ARK_VIDEO_MODEL
        ? "ark-video-configured"
        : "ark-video-missing-model"
      : "mock-only"
});
