import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().default("videopilot"),
  S3_ACCESS_KEY_ID: z.string().default("minioadmin"),
  S3_SECRET_ACCESS_KEY: z.string().default("minioadmin"),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  LOCAL_PUBLIC_STORAGE_URL: z.string().default("http://localhost:9000/videopilot"),
  TTS_PROVIDER: z.enum(["mock", "ark", "hybrid"]).default("mock"),
  BGM_PROVIDER: z.enum(["mock", "local"]).default("mock"),
  COMPLIANCE_PROVIDER: z.enum(["rules", "mock", "external"]).default("rules"),
  ANALYTICS_PROVIDER: z.enum(["manual", "csv", "mock", "external"]).default("manual")
});

export const config = envSchema.parse(process.env);
