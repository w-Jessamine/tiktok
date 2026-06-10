import type {
  AssetCreateInput,
  GenerationJobDto,
  ProductCreateInput,
  ScriptGenerateInput,
  ScriptModel,
  ScriptPatchInput,
  VideoExportDto as SharedVideoExportDto,
  VideoGenerateInput
} from "@videopilot/shared";
import {
  demoAnalytics,
  demoAssets,
  demoExperiment,
  demoExports,
  demoJob,
  demoProducts,
  demoScripts
} from "./demo-data";

const API_BASE = import.meta.env.PUBLIC_API_BASE_URL ?? "";
let demoFallbackActive = import.meta.env.PUBLIC_DEMO_MODE === "true";
const demoProduct = demoProducts[0]!;
const demoAsset = demoAssets[0]!;
const demoScript = demoScripts[0]!;

const normalizeUrl = (url: string) => {
  if (!url.startsWith("/storage/")) {
    return url;
  }
  return `${API_BASE}${url}`;
};

type Envelope<T> = {
  data: T;
  requestId: string;
};

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(error?.error?.message ?? response.statusText);
  }
  const envelope = (await response.json()) as Envelope<T>;
  return envelope.data;
};

const cloneDemo = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const withDemoFallback = async <T>(loader: () => Promise<T>, fallback: T): Promise<T> => {
  if (demoFallbackActive) {
    return cloneDemo(fallback);
  }
  try {
    return await loader();
  } catch (error) {
    demoFallbackActive = true;
    console.warn("VideoPilot API unavailable; using local reviewer demo data.", error);
    return cloneDemo(fallback);
  }
};

export const isDemoFallbackActive = () => demoFallbackActive;

export type ProductDto = ProductCreateInput & {
  id: string;
  createdAt: string;
  assets?: AssetDto[];
  scripts?: ScriptDto[];
};

export type AssetDto = AssetCreateInput & {
  id: string;
  objectKey: string;
  thumbnailUrl?: string | null;
  complianceStatus: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_REVIEW" | "PROVIDER_FAILED";
  productTags: string[];
  videoSummary?: string | null;
  slices: Array<{
    id: string;
    summary: string;
    tags: string[];
    startMs: number;
    endMs: number;
    thumbnailUrl?: string | null;
    isUsable: boolean;
  }>;
  score?: number;
};

export type ScriptDto = Omit<ScriptModel, "shots"> & {
  id: string;
  createdAt: string;
  updatedAt: string;
  shots: Array<ScriptModel["shots"][number] & { id: string; scriptId: string }>;
};

export type VideoExportDto = SharedVideoExportDto;

export type ComplianceReviewDto = {
  id: string;
  objectType: "ASSET" | "SCRIPT" | "SHOT" | "VIDEO_EXPORT";
  objectId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_REVIEW" | "PROVIDER_FAILED";
  ruleHits: string[];
  reviewerNote?: string | null;
};

export type VideoExperimentDto = {
  id: string;
  productId: string;
  goal: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "PARTIAL" | "FAILED";
  variants: Array<{
    id: string;
    name: string;
    factors: Record<string, unknown>;
    metricSummary: Record<string, unknown>;
    scriptId?: string | null;
    jobId?: string | null;
    exportId?: string | null;
    generationJobs?: GenerationJobDto[];
    exports?: VideoExportDto[];
  }>;
};

export type AnalyticsFactor = {
  factor: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cvr: number;
  gmv: number;
  roi?: number;
  cpa?: number;
  aov?: number;
  spend?: number;
  watchSeconds?: number;
  channels?: string[];
  sources?: string[];
};

export const api = {
  health: async () => {
    if (demoFallbackActive) {
      return { connected: false, mode: "demo" as const };
    }
    try {
      const response = await fetch(`${API_BASE}/health`);
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return { connected: true, mode: "live" as const };
    } catch (error) {
      demoFallbackActive = true;
      console.warn("VideoPilot API health check failed; using local reviewer demo data.", error);
      return { connected: false, mode: "demo" as const };
    }
  },
  products: () => withDemoFallback(() => requestJson<ProductDto[]>("/api/products"), demoProducts),
  createProduct: (input: ProductCreateInput) =>
    withDemoFallback(
      () =>
        requestJson<ProductDto>("/api/products", { method: "POST", body: JSON.stringify(input) }),
      demoProduct
    ),
  uploadAsset: async (input: {
    file: File;
    productId?: string;
    type: AssetCreateInput["type"];
    sourceStatement: string;
  }) => {
    if (demoFallbackActive) {
      return cloneDemo({ asset: demoAsset, job: demoJob });
    }
    const form = new FormData();
    form.append("file", input.file);
    if (input.productId) {
      form.append("productId", input.productId);
    }
    form.append("type", input.type);
    form.append("sourceStatement", input.sourceStatement);
    try {
      const response = await fetch(`${API_BASE}/api/assets/upload`, { method: "POST", body: form });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const envelope = (await response.json()) as Envelope<{
        asset: AssetDto;
        job: GenerationJobDto;
      }>;
      envelope.data.asset.url = normalizeUrl(envelope.data.asset.url);
      return envelope.data;
    } catch (error) {
      demoFallbackActive = true;
      console.warn("VideoPilot asset upload unavailable; using local reviewer demo data.", error);
      return cloneDemo({ asset: demoAsset, job: demoJob });
    }
  },
  searchAssets: (query: { q?: string; productId?: string; tag?: string }) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    const fallback = demoAssets.filter((asset) => {
      const q = query.q?.toLowerCase();
      const text = `${asset.filename} ${asset.videoSummary ?? ""} ${asset.productTags.join(" ")}`;
      return (
        (!query.productId || asset.productId === query.productId) &&
        (!query.tag || asset.productTags.includes(query.tag)) &&
        (!q ||
          text.toLowerCase().includes(q) ||
          asset.slices.some((slice) => slice.summary.toLowerCase().includes(q)))
      );
    });
    return withDemoFallback(
      () =>
        requestJson<AssetDto[]>(`/api/assets/search?${params.toString()}`).then((assets) =>
          assets.map((asset) => ({
            ...asset,
            url: normalizeUrl(asset.url),
            thumbnailUrl: asset.thumbnailUrl
              ? normalizeUrl(asset.thumbnailUrl)
              : asset.thumbnailUrl,
            slices: asset.slices.map((slice) => ({
              ...slice,
              thumbnailUrl: slice.thumbnailUrl
                ? normalizeUrl(slice.thumbnailUrl)
                : slice.thumbnailUrl
            }))
          }))
        ),
      fallback
    );
  },
  generateScripts: (input: ScriptGenerateInput) =>
    withDemoFallback(
      () =>
        requestJson<ScriptDto[]>("/api/scripts/generate", {
          method: "POST",
          body: JSON.stringify(input)
        }),
      demoScripts
    ),
  scripts: (productId?: string) =>
    withDemoFallback(
      () => requestJson<ScriptDto[]>(`/api/scripts${productId ? `?productId=${productId}` : ""}`),
      demoScripts.filter((script) => !productId || script.productId === productId)
    ),
  patchScript: (id: string, input: ScriptPatchInput) =>
    withDemoFallback(
      () =>
        requestJson<ScriptDto>(`/api/scripts/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input)
        }),
      { ...demoScript, ...input, id }
    ),
  generateVideo: (input: VideoGenerateInput) =>
    withDemoFallback(
      () =>
        requestJson<GenerationJobDto>("/api/videos/generate", {
          method: "POST",
          body: JSON.stringify(input)
        }),
      demoJob
    ),
  createExperiment: (input: {
    productId: string;
    goal: string;
    variantCount: number;
    aspectRatio: "VERTICAL_9_16" | "HORIZONTAL_16_9";
    voiceEnabled: boolean;
    bgmEnabled: boolean;
  }) =>
    withDemoFallback(
      () =>
        requestJson<{ experiment: VideoExperimentDto; variants: VideoExperimentDto["variants"] }>(
          "/api/videos/experiments",
          {
            method: "POST",
            body: JSON.stringify(input)
          }
        ),
      { experiment: demoExperiment, variants: demoExperiment.variants }
    ),
  experiment: (id: string) =>
    withDemoFallback(() => requestJson<VideoExperimentDto>(`/api/videos/experiments/${id}`), {
      ...demoExperiment,
      id
    }),
  regenerateShot: (
    scriptId: string,
    shotId: string,
    input: { prompt?: string; materialQuery?: string }
  ) =>
    withDemoFallback(
      () =>
        requestJson<GenerationJobDto>(`/api/videos/${scriptId}/shots/${shotId}/regenerate`, {
          method: "POST",
          body: JSON.stringify(input)
        }),
      {
        ...demoJob,
        id: "demo-job-shot-regeneration",
        type: "SHOT_REGENERATION",
        input: { scriptId, shotId, ...input }
      }
    ),
  exports: async (scriptId?: string) => {
    const exports = await withDemoFallback(
      () =>
        requestJson<VideoExportDto[]>(
          `/api/videos/exports${scriptId ? `?scriptId=${scriptId}` : ""}`
        ),
      demoExports.filter((item) => !scriptId || item.scriptId === scriptId)
    );
    return exports.map((item) => ({
      ...item,
      fileUrl: normalizeUrl(item.fileUrl),
      coverUrl: item.coverUrl ? normalizeUrl(item.coverUrl) : item.coverUrl
    }));
  },
  job: (id: string) =>
    withDemoFallback(() => requestJson<GenerationJobDto>(`/api/jobs/${id}`), {
      ...demoJob,
      id
    }),
  retryJob: (id: string) =>
    withDemoFallback(
      () =>
        requestJson<GenerationJobDto>(`/api/jobs/${id}/retry`, {
          method: "POST",
          body: JSON.stringify({})
        }),
      { ...demoJob, id, retryCount: demoJob.retryCount + 1 }
    ),
  analytics: () =>
    withDemoFallback(() => requestJson<AnalyticsFactor[]>("/api/analytics/factors"), demoAnalytics),
  createMetric: (input: {
    productId?: string;
    scriptId?: string;
    exportId?: string;
    factor: string;
    impressions: number;
    clicks: number;
    conversions: number;
    gmvCents: number;
    source?: string;
  }) =>
    withDemoFallback(
      () => requestJson("/api/analytics/factors", { method: "POST", body: JSON.stringify(input) }),
      { ok: true }
    ),
  importMetrics: (input: {
    rows: Array<{
      factor: string;
      impressions: number;
      clicks: number;
      orders: number;
      gmv: number;
      spend?: number;
      channel?: string;
      watchSeconds?: number;
    }>;
  }) =>
    withDemoFallback(
      () =>
        requestJson("/api/analytics/import", {
          method: "POST",
          body: JSON.stringify({ source: "CSV", ...input })
        }),
      { ok: true, rowsImported: input.rows.length }
    ),
  reviewCompliance: (input: { objectType: ComplianceReviewDto["objectType"]; objectId: string }) =>
    withDemoFallback(
      () =>
        requestJson<ComplianceReviewDto>("/api/compliance/review", {
          method: "POST",
          body: JSON.stringify(input)
        }),
      {
        id: "demo-compliance-review",
        objectType: input.objectType,
        objectId: input.objectId,
        status: "APPROVED",
        ruleHits: [],
        reviewerNote: "Demo reviewer data keeps source and product-truth constraints visible."
      }
    ),
  decideCompliance: (
    id: string,
    input: { status: "APPROVED" | "REJECTED" | "NEEDS_REVIEW"; reviewerNote?: string }
  ) =>
    withDemoFallback(
      () =>
        requestJson<ComplianceReviewDto>(`/api/compliance/${id}/decision`, {
          method: "PATCH",
          body: JSON.stringify(input)
        }),
      {
        id,
        objectType: "ASSET",
        objectId: demoAsset.id,
        status: input.status,
        ruleHits: [],
        reviewerNote: input.reviewerNote
      }
    ),
  previewAudio: (input: { text: string; language: string; mood: string; durationMs: number }) =>
    withDemoFallback(
      () =>
        requestJson<{
          provider: string;
          status: string;
          note: string;
          durationMs: number;
        }>("/api/audio/preview", { method: "POST", body: JSON.stringify(input) }),
      {
        provider: "mock",
        status: "fallback",
        note: "Demo audio preview uses renderer fallback tone in local reviewer mode.",
        durationMs: input.durationMs
      }
    )
};
