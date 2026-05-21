import { z } from "zod";

const envSchema = z.object({
  REDIS_URL: z.string().default("redis://localhost:6379"),
  LOCAL_PUBLIC_STORAGE_URL: z.string().default("/storage"),
  WORKER_OUTPUT_DIR: z.string().default("storage/generated")
});

export const config = envSchema.parse(process.env);
