import { z } from "zod";

export const assetTypeSchema = z.enum([
  "PRODUCT_IMAGE",
  "PRODUCT_VIDEO",
  "REFERENCE_IMAGE",
  "REFERENCE_VIDEO"
]);

export const jobTypeSchema = z.enum([
  "ASSET_ANALYSIS",
  "SCRIPT_GENERATION",
  "VIDEO_GENERATION",
  "SHOT_REGENERATION"
]);

export const jobStatusSchema = z.enum(["QUEUED", "RUNNING", "RETRYABLE", "FAILED", "COMPLETED"]);
export const aspectRatioSchema = z.enum(["VERTICAL_9_16", "HORIZONTAL_16_9"]);

export const productCreateSchema = z.object({
  title: z.string().min(2),
  category: z.string().min(1),
  sellingPoints: z.array(z.string().min(1)).min(1).max(8),
  audience: z.string().min(1),
  scenario: z.string().min(1),
  productUrl: z.string().url().optional().or(z.literal("")),
  language: z.string().default("en-US")
});

export const assetCreateSchema = z.object({
  productId: z.string().optional(),
  type: assetTypeSchema,
  filename: z.string().min(1),
  url: z.string().min(1),
  sourceStatement: z.string().min(6)
});

export const assetSliceSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  thumbnailUrl: z.string().optional().nullable(),
  summary: z.string(),
  tags: z.array(z.string()),
  isUsable: z.boolean()
});

export const storyboardShotSchema = z.object({
  id: z.string().optional(),
  order: z.number().int().nonnegative(),
  durationMs: z.number().int().min(1200).max(5000),
  visualPrompt: z.string().min(5),
  cameraMotion: z.string().min(2),
  materialQuery: z.string().min(2),
  subtitle: z.string().min(1).max(90),
  voiceover: z.string().min(1).max(220),
  bgmMood: z.string().min(1),
  selectedSliceId: z.string().optional().nullable(),
  generatedUrl: z.string().optional().nullable()
});

export const scriptSchema = z.object({
  id: z.string().optional(),
  productId: z.string(),
  templateId: z.string().optional().nullable(),
  title: z.string().min(3),
  narrative: z.string().min(10),
  visualStyle: z.string().min(3),
  language: z.string().default("en-US"),
  constraints: z.array(z.string()).min(1),
  prompt: z.string().default(""),
  version: z.number().int().positive().default(1),
  shots: z.array(storyboardShotSchema).min(4).max(6)
});

export const scriptPatchSchema = z.object({
  title: z.string().min(3).optional(),
  narrative: z.string().min(10).optional(),
  visualStyle: z.string().min(3).optional(),
  constraints: z.array(z.string()).optional(),
  prompt: z.string().optional(),
  shots: z.array(storyboardShotSchema).min(1).max(8).optional()
});

export const scriptGenerateSchema = z.object({
  productId: z.string(),
  templateId: z.string().optional(),
  prompt: z.string().max(1200).optional(),
  mode: z.enum(["viral_rewrite", "template", "auto"]).default("auto"),
  count: z.number().int().min(1).max(3).default(3)
});

export const videoGenerateSchema = z.object({
  productId: z.string(),
  scriptId: z.string(),
  aspectRatio: aspectRatioSchema.default("VERTICAL_9_16"),
  resolution: z.string().default("720x1280")
});

export const shotRegenerateSchema = z.object({
  shotId: z.string(),
  prompt: z.string().max(800).optional(),
  materialQuery: z.string().max(200).optional()
});

export type AssetType = z.infer<typeof assetTypeSchema>;
export type JobType = z.infer<typeof jobTypeSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type VideoAspectRatio = z.infer<typeof aspectRatioSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type AssetCreateInput = z.infer<typeof assetCreateSchema>;
export type StoryboardShot = z.infer<typeof storyboardShotSchema>;
export type ScriptModel = z.infer<typeof scriptSchema>;
export type ScriptPatchInput = z.infer<typeof scriptPatchSchema>;
export type ScriptGenerateInput = z.infer<typeof scriptGenerateSchema>;
export type VideoGenerateInput = z.infer<typeof videoGenerateSchema>;

export type TraceEvent = {
  at: string;
  stage: string;
  message: string;
  meta?: Record<string, unknown>;
};

export type GenerationJobDto = {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  productId?: string | null;
  scriptId?: string | null;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  trace: TraceEvent[];
  error?: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ApiEnvelope<T> = {
  data: T;
  requestId: string;
};

export const clampVideoDuration = (shots: StoryboardShot[]) => {
  const total = shots.reduce((sum, shot) => sum + shot.durationMs, 0);
  return Math.min(total, 15000);
};
