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

const API_BASE = import.meta.env.PUBLIC_API_BASE_URL ?? "";

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
  products: () => requestJson<ProductDto[]>("/api/products"),
  createProduct: (input: ProductCreateInput) =>
    requestJson<ProductDto>("/api/products", { method: "POST", body: JSON.stringify(input) }),
  uploadAsset: async (input: {
    file: File;
    productId?: string;
    type: AssetCreateInput["type"];
    sourceStatement: string;
  }) => {
    const form = new FormData();
    form.append("file", input.file);
    if (input.productId) {
      form.append("productId", input.productId);
    }
    form.append("type", input.type);
    form.append("sourceStatement", input.sourceStatement);
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
  },
  searchAssets: (query: { q?: string; productId?: string; tag?: string }) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    return requestJson<AssetDto[]>(`/api/assets/search?${params.toString()}`).then((assets) =>
      assets.map((asset) => ({
        ...asset,
        url: normalizeUrl(asset.url),
        thumbnailUrl: asset.thumbnailUrl ? normalizeUrl(asset.thumbnailUrl) : asset.thumbnailUrl,
        slices: asset.slices.map((slice) => ({
          ...slice,
          thumbnailUrl: slice.thumbnailUrl ? normalizeUrl(slice.thumbnailUrl) : slice.thumbnailUrl
        }))
      }))
    );
  },
  generateScripts: (input: ScriptGenerateInput) =>
    requestJson<ScriptDto[]>("/api/scripts/generate", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  scripts: (productId?: string) =>
    requestJson<ScriptDto[]>(`/api/scripts${productId ? `?productId=${productId}` : ""}`),
  patchScript: (id: string, input: ScriptPatchInput) =>
    requestJson<ScriptDto>(`/api/scripts/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  generateVideo: (input: VideoGenerateInput) =>
    requestJson<GenerationJobDto>("/api/videos/generate", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  createExperiment: (input: {
    productId: string;
    goal: string;
    variantCount: number;
    aspectRatio: "VERTICAL_9_16" | "HORIZONTAL_16_9";
    voiceEnabled: boolean;
    bgmEnabled: boolean;
  }) =>
    requestJson<{ experiment: VideoExperimentDto; variants: VideoExperimentDto["variants"] }>(
      "/api/videos/experiments",
      {
        method: "POST",
        body: JSON.stringify(input)
      }
    ),
  experiment: (id: string) => requestJson<VideoExperimentDto>(`/api/videos/experiments/${id}`),
  regenerateShot: (
    scriptId: string,
    shotId: string,
    input: { prompt?: string; materialQuery?: string }
  ) =>
    requestJson<GenerationJobDto>(`/api/videos/${scriptId}/shots/${shotId}/regenerate`, {
      method: "POST",
      body: JSON.stringify(input)
    }),
  exports: async (scriptId?: string) => {
    const exports = await requestJson<VideoExportDto[]>(
      `/api/videos/exports${scriptId ? `?scriptId=${scriptId}` : ""}`
    );
    return exports.map((item) => ({
      ...item,
      fileUrl: normalizeUrl(item.fileUrl),
      coverUrl: item.coverUrl ? normalizeUrl(item.coverUrl) : item.coverUrl
    }));
  },
  job: (id: string) => requestJson<GenerationJobDto>(`/api/jobs/${id}`),
  retryJob: (id: string) =>
    requestJson<GenerationJobDto>(`/api/jobs/${id}/retry`, {
      method: "POST",
      body: JSON.stringify({})
    }),
  analytics: () => requestJson<AnalyticsFactor[]>("/api/analytics/factors"),
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
  }) => requestJson("/api/analytics/factors", { method: "POST", body: JSON.stringify(input) }),
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
    requestJson("/api/analytics/import", {
      method: "POST",
      body: JSON.stringify({ source: "CSV", ...input })
    }),
  reviewCompliance: (input: { objectType: ComplianceReviewDto["objectType"]; objectId: string }) =>
    requestJson<ComplianceReviewDto>("/api/compliance/review", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  decideCompliance: (
    id: string,
    input: { status: "APPROVED" | "REJECTED" | "NEEDS_REVIEW"; reviewerNote?: string }
  ) =>
    requestJson<ComplianceReviewDto>(`/api/compliance/${id}/decision`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }),
  previewAudio: (input: { text: string; language: string; mood: string; durationMs: number }) =>
    requestJson<{
      provider: string;
      status: string;
      note: string;
      durationMs: number;
    }>("/api/audio/preview", { method: "POST", body: JSON.stringify(input) })
};
