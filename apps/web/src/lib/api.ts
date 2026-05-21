import type {
  AssetCreateInput,
  GenerationJobDto,
  ProductCreateInput,
  ScriptGenerateInput,
  ScriptModel,
  ScriptPatchInput,
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
    const error = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
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
  complianceStatus: "PENDING" | "APPROVED" | "REJECTED";
  productTags: string[];
  videoSummary?: string | null;
  slices: Array<{
    id: string;
    summary: string;
    tags: string[];
    startMs: number;
    endMs: number;
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

export type VideoExportDto = {
  id: string;
  scriptId: string;
  aspectRatio: "VERTICAL_9_16" | "HORIZONTAL_16_9";
  resolution: string;
  durationMs: number;
  fileUrl: string;
  coverUrl?: string | null;
};

export type AnalyticsFactor = {
  factor: string;
  impressions: number;
  ctr: number;
  cvr: number;
  gmv: number;
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
    const envelope = (await response.json()) as Envelope<{ asset: AssetDto; job: GenerationJobDto }>;
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
    return requestJson<AssetDto[]>(`/api/assets/search?${params.toString()}`);
  },
  generateScripts: (input: ScriptGenerateInput) =>
    requestJson<ScriptDto[]>("/api/scripts/generate", { method: "POST", body: JSON.stringify(input) }),
  scripts: (productId?: string) =>
    requestJson<ScriptDto[]>(`/api/scripts${productId ? `?productId=${productId}` : ""}`),
  patchScript: (id: string, input: ScriptPatchInput) =>
    requestJson<ScriptDto>(`/api/scripts/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  generateVideo: (input: VideoGenerateInput) =>
    requestJson<GenerationJobDto>("/api/videos/generate", { method: "POST", body: JSON.stringify(input) }),
  regenerateShot: (scriptId: string, shotId: string, input: { prompt?: string; materialQuery?: string }) =>
    requestJson<GenerationJobDto>(`/api/videos/${scriptId}/shots/${shotId}/regenerate`, {
      method: "POST",
      body: JSON.stringify(input)
    }),
  exports: async (scriptId?: string) => {
    const exports = await requestJson<VideoExportDto[]>(`/api/videos/exports${scriptId ? `?scriptId=${scriptId}` : ""}`);
    return exports.map((item) => ({
      ...item,
      fileUrl: normalizeUrl(item.fileUrl),
      coverUrl: item.coverUrl ? normalizeUrl(item.coverUrl) : item.coverUrl
    }));
  },
  job: (id: string) => requestJson<GenerationJobDto>(`/api/jobs/${id}`),
  retryJob: (id: string) =>
    requestJson<GenerationJobDto>(`/api/jobs/${id}/retry`, { method: "POST", body: JSON.stringify({}) }),
  analytics: () => requestJson<AnalyticsFactor[]>("/api/analytics/factors")
};
