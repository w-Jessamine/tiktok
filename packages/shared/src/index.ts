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
  "SHOT_REGENERATION",
  "EXPERIMENT_GENERATION"
]);

export const jobStatusSchema = z.enum(["QUEUED", "RUNNING", "RETRYABLE", "FAILED", "COMPLETED"]);
export const aspectRatioSchema = z.enum(["VERTICAL_9_16", "HORIZONTAL_16_9"]);
export const complianceStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "NEEDS_REVIEW",
  "PROVIDER_FAILED"
]);
export const complianceObjectTypeSchema = z.enum(["ASSET", "SCRIPT", "SHOT", "VIDEO_EXPORT"]);
export const analyticsSourceSchema = z.enum(["MANUAL", "CSV", "MOCK", "EXTERNAL"]);
export const videoRenderSourceSchema = z.enum([
  "ARK_GENERATED",
  "MATERIAL_MIX",
  "DYNAMIC_FALLBACK",
  "STORYBOARD_FALLBACK"
]);

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
  resolution: z.string().default("720x1280"),
  voiceEnabled: z.boolean().default(false),
  bgmEnabled: z.boolean().default(false),
  voiceLocale: z.string().default("en-US"),
  bgmMood: z.string().default("upbeat"),
  audioMix: z
    .object({
      voiceVolume: z.number().min(0).max(1).default(0.9),
      bgmVolume: z.number().min(0).max(1).default(0.18)
    })
    .default({ voiceVolume: 0.9, bgmVolume: 0.18 }),
  variantId: z.string().optional()
});

export const factorMetricCreateSchema = z.object({
  productId: z.string().optional(),
  scriptId: z.string().optional(),
  exportId: z.string().optional(),
  variantId: z.string().optional(),
  factor: z.string().min(2),
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  gmvCents: z.number().int().nonnegative(),
  spendCents: z.number().int().nonnegative().default(0),
  watchSeconds: z.number().int().nonnegative().default(0),
  channel: z.string().optional(),
  source: z.string().default("manual")
});

export const shotRegenerateSchema = z.object({
  shotId: z.string(),
  prompt: z.string().max(800).optional(),
  materialQuery: z.string().max(200).optional()
});

export const videoExperimentCreateSchema = z.object({
  productId: z.string(),
  baseScriptId: z.string().optional(),
  goal: z.string().min(3).default("Compare conversion-oriented creative angles"),
  variantCount: z.number().int().min(2).max(3).default(2),
  aspectRatio: aspectRatioSchema.default("VERTICAL_9_16"),
  voiceEnabled: z.boolean().default(false),
  bgmEnabled: z.boolean().default(true)
});

export const complianceReviewSchema = z.object({
  objectType: complianceObjectTypeSchema,
  objectId: z.string()
});

export const complianceDecisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "NEEDS_REVIEW"]),
  reviewerNote: z.string().max(1000).optional()
});

export const analyticsImportRowSchema = z.object({
  videoId: z.string().optional(),
  variantId: z.string().optional(),
  productId: z.string().optional(),
  scriptId: z.string().optional(),
  channel: z.string().default("manual"),
  date: z.string().optional(),
  factor: z.string().min(2).default("Imported creative"),
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  orders: z.number().int().nonnegative(),
  gmv: z.number().nonnegative(),
  spend: z.number().nonnegative().default(0),
  watchSeconds: z.number().int().nonnegative().default(0)
});

export const analyticsImportSchema = z.object({
  source: analyticsSourceSchema.default("CSV"),
  filename: z.string().optional(),
  rows: z.array(analyticsImportRowSchema).min(1).max(500)
});

export const audioPreviewSchema = z.object({
  text: z.string().min(1).max(500),
  language: z.string().default("en-US"),
  mood: z.string().default("upbeat"),
  durationMs: z.number().int().min(500).max(15000).default(3000)
});

export type AssetType = z.infer<typeof assetTypeSchema>;
export type JobType = z.infer<typeof jobTypeSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type VideoAspectRatio = z.infer<typeof aspectRatioSchema>;
export type ComplianceStatus = z.infer<typeof complianceStatusSchema>;
export type ComplianceObjectType = z.infer<typeof complianceObjectTypeSchema>;
export type VideoRenderSource = z.infer<typeof videoRenderSourceSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type AssetCreateInput = z.infer<typeof assetCreateSchema>;
export type StoryboardShot = z.infer<typeof storyboardShotSchema>;
export type ScriptModel = z.infer<typeof scriptSchema>;
export type ScriptPatchInput = z.infer<typeof scriptPatchSchema>;
export type ScriptGenerateInput = z.infer<typeof scriptGenerateSchema>;
export type VideoGenerateInput = z.infer<typeof videoGenerateSchema>;
export type FactorMetricCreateInput = z.infer<typeof factorMetricCreateSchema>;
export type VideoExperimentCreateInput = z.infer<typeof videoExperimentCreateSchema>;
export type ComplianceReviewInput = z.infer<typeof complianceReviewSchema>;
export type ComplianceDecisionInput = z.infer<typeof complianceDecisionSchema>;
export type AnalyticsImportInput = z.infer<typeof analyticsImportSchema>;
export type AudioPreviewInput = z.infer<typeof audioPreviewSchema>;

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

export type VideoExportDto = {
  id: string;
  scriptId: string;
  aspectRatio: VideoAspectRatio;
  resolution: string;
  durationMs: number;
  fileUrl: string;
  coverUrl?: string | null;
  renderSource: VideoRenderSource;
  config: Record<string, unknown>;
  createdAt?: string;
};

export type ApiEnvelope<T> = {
  data: T;
  requestId: string;
};

export const clampVideoDuration = (shots: StoryboardShot[]) => {
  const total = shots.reduce((sum, shot) => sum + shot.durationMs, 0);
  return Math.min(total, 15000);
};
