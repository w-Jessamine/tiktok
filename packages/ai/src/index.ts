import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import {
  type ProductCreateInput,
  type ScriptModel,
  type StoryboardShot,
  scriptSchema
} from "@videopilot/shared";

export type AiProviderMode = "ark" | "mock" | "hybrid";

export type AssetAnalysisInput = {
  filename: string;
  type: string;
  sourceStatement: string;
  product?: ProductCreateInput;
};

export type AssetAnalysis = {
  productTags: string[];
  videoSummary: string;
  slices: Array<{
    startMs: number;
    endMs: number;
    summary: string;
    tags: string[];
  }>;
  embedding: number[];
};

export type VideoGenerationInput = {
  shot: StoryboardShot;
  aspectRatio: "VERTICAL_9_16" | "HORIZONTAL_16_9";
  productTitle: string;
  imageUrl?: string | null;
};

export type VideoGenerationOutput = {
  provider: "ark" | "mock";
  url?: string;
  taskId?: string;
  status?: ArkVideoTaskStatus | "fallback";
  note: string;
  raw?: unknown;
  debugSample?: ArkVideoDebugSample;
};

export type ArkVideoTaskStatus =
  | "submitted"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "review_failed"
  | "unknown";

export type ArkVideoArtifact = {
  url: string;
  kind: "video" | "cover" | "unknown";
  path: string;
};

export type ArkVideoTaskCreateResult = {
  taskId?: string;
  status: ArkVideoTaskStatus;
  artifacts: ArkVideoArtifact[];
  errorCode?: string;
  message?: string;
  debugSample?: ArkVideoDebugSample;
};

export type ArkVideoTaskPollResult = ArkVideoTaskCreateResult;

export type ArkVideoDebugSample = {
  capturedAt: string;
  topLevelKeys: string[];
  statusPaths: string[];
  idPaths: string[];
  urlPaths: string[];
  errorPaths: string[];
};

export type AudioSynthesisInput = {
  text: string;
  language: string;
  mood?: string;
  durationMs: number;
  outputDir: string;
};

export type AudioSynthesisOutput = {
  provider: "mock" | "ark" | "local";
  filePath: string;
  durationMs: number;
  status: "ready" | "fallback";
  note: string;
};

export interface TtsProvider {
  synthesize(input: AudioSynthesisInput): Promise<AudioSynthesisOutput>;
}

export interface BgmProvider {
  createBed(input: Omit<AudioSynthesisInput, "text">): Promise<AudioSynthesisOutput>;
}

export interface AiProvider {
  analyzeAsset(input: AssetAnalysisInput): Promise<AssetAnalysis>;
  generateScripts(input: {
    product: ProductCreateInput & { id: string };
    prompt?: string;
    count: number;
    templateName?: string;
  }): Promise<ScriptModel[]>;
  generateShotVideo(input: VideoGenerationInput): Promise<VideoGenerationOutput>;
  embed(text: string): Promise<number[]>;
}

const seededVector = (text: string, dimensions = 32) => {
  let seed = 17;
  for (const char of text) {
    seed = (seed * 31 + char.charCodeAt(0)) % 9973;
  }
  return Array.from({ length: dimensions }, (_, index) => {
    seed = (seed * 37 + index * 11) % 10007;
    return Number(((seed / 10007) * 2 - 1).toFixed(4));
  });
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeEmbedding = (vector: number[], dimensions = 64) => {
  if (!vector.length) {
    return seededVector("empty", dimensions);
  }
  const padded = Array.from(
    { length: dimensions },
    (_, index) => vector[index % vector.length] ?? 0
  );
  const norm = Math.sqrt(padded.reduce((sum, value) => sum + value * value, 0)) || 1;
  return padded.map((value) => Number((value / norm).toFixed(6)));
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const redactPayloadShape = (payload: unknown): ArkVideoDebugSample => {
  const topLevelKeys = isRecord(payload) ? Object.keys(payload).sort() : [];
  const statusPaths: string[] = [];
  const idPaths: string[] = [];
  const urlPaths: string[] = [];
  const errorPaths: string[] = [];

  const walk = (value: unknown, currentPath: string, depth: number) => {
    if (depth > 5 || !isRecord(value)) {
      return;
    }
    for (const [key, nested] of Object.entries(value)) {
      const nextPath = currentPath ? `${currentPath}.${key}` : key;
      const lower = key.toLowerCase();
      if (["status", "state", "phase"].includes(lower)) {
        statusPaths.push(nextPath);
      }
      if (["id", "task_id", "taskid", "taskId"].map(String).includes(key)) {
        idPaths.push(nextPath);
      }
      if (lower.includes("url")) {
        urlPaths.push(nextPath);
      }
      if (lower.includes("error") || lower.includes("code") || lower.includes("message")) {
        errorPaths.push(nextPath);
      }
      if (Array.isArray(nested)) {
        nested.slice(0, 3).forEach((item, index) => walk(item, `${nextPath}[${index}]`, depth + 1));
      } else {
        walk(nested, nextPath, depth + 1);
      }
    }
  };

  walk(payload, "", 0);
  return {
    capturedAt: new Date().toISOString(),
    topLevelKeys,
    statusPaths: [...new Set(statusPaths)].sort(),
    idPaths: [...new Set(idPaths)].sort(),
    urlPaths: [...new Set(urlPaths)].sort(),
    errorPaths: [...new Set(errorPaths)].sort()
  };
};

export const writeArkVideoDebugSample = async (
  payload: unknown,
  outputDir = path.resolve(process.cwd(), "storage", "ark-debug")
) => {
  const sample = redactPayloadShape(payload);
  await mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `${Date.now()}-ark-video-shape.json`);
  await writeFile(filePath, JSON.stringify(sample, null, 2));
  return { filePath, sample };
};

export class MockAiProvider implements AiProvider {
  async analyzeAsset(input: AssetAnalysisInput): Promise<AssetAnalysis> {
    const lower = `${input.filename} ${input.product?.category ?? ""}`.toLowerCase();
    const baseTags = lower.includes("beauty")
      ? ["beauty", "texture", "routine", "closeup"]
      : lower.includes("home")
        ? ["home", "storage", "lifestyle", "before-after"]
        : ["product", "detail", "demo", "lifestyle"];

    return {
      productTags: baseTags,
      videoSummary: `Structured asset analysis for ${input.filename}: product appearance, usage scene and conversion-friendly details are ready for script recall.`,
      slices: [
        {
          startMs: 0,
          endMs: 3000,
          summary: "Opening hero angle with clear product recognition.",
          tags: [baseTags[0] ?? "product", "hook", "hero"]
        },
        {
          startMs: 3000,
          endMs: 7000,
          summary: "Close-up slice showing texture, scale or key feature.",
          tags: [baseTags[1] ?? "detail", "feature", "closeup"]
        },
        {
          startMs: 7000,
          endMs: 11000,
          summary: "Usage moment that connects the product to a daily scenario.",
          tags: [baseTags[2] ?? "lifestyle", "usage", "payoff"]
        }
      ],
      embedding: seededVector(input.filename)
    };
  }

  async generateScripts(input: {
    product: ProductCreateInput & { id: string };
    prompt?: string;
    count: number;
    templateName?: string;
  }): Promise<ScriptModel[]> {
    const templateNames = ["Pain Point Hook", "Lifestyle Seeding", "Texture Detail"];
    return Array.from({ length: input.count }, (_, index) => {
      const title = `${input.product.title} - ${templateNames[index] ?? "Conversion Story"}`;
      const style =
        index === 1
          ? "sunny lifestyle UGC"
          : index === 2
            ? "macro detail editorial"
            : "fast benefit-led demo";
      const shots: StoryboardShot[] = [
        {
          order: 0,
          durationMs: 2400,
          visualPrompt: `Open with ${input.product.scenario} pain point and product reveal.`,
          cameraMotion: "quick push-in",
          materialQuery: "hero hook product scene",
          subtitle: "Still dealing with this?",
          voiceover: `If ${input.product.audience} need a faster fix, start here.`,
          bgmMood: "confident upbeat"
        },
        {
          order: 1,
          durationMs: 2600,
          visualPrompt: `Show ${input.product.title} solving the first key use case.`,
          cameraMotion: "handheld follow",
          materialQuery: input.product.sellingPoints[0] ?? "main benefit",
          subtitle: input.product.sellingPoints[0] ?? "Designed for daily wins",
          voiceover: `${input.product.sellingPoints[0] ?? "The main benefit"} shows up in seconds.`,
          bgmMood: "clean rhythmic"
        },
        {
          order: 2,
          durationMs: 2600,
          visualPrompt: "Cut to material, detail, size or before-after proof.",
          cameraMotion: "macro pan",
          materialQuery: "detail texture proof",
          subtitle: "Details you can see",
          voiceover: "The close-up makes the quality easy to trust.",
          bgmMood: "satisfying pop"
        },
        {
          order: 3,
          durationMs: 2800,
          visualPrompt: `Place the product in ${input.product.scenario} with a natural lifestyle payoff.`,
          cameraMotion: "smooth pull-back",
          materialQuery: "lifestyle payoff scene",
          subtitle: "Fits your routine",
          voiceover: `It fits naturally into ${input.product.scenario}.`,
          bgmMood: "warm lift"
        },
        {
          order: 4,
          durationMs: 2400,
          visualPrompt: "End with product packshot, value message and CTA.",
          cameraMotion: "locked packshot",
          materialQuery: "packshot call to action",
          subtitle: "Tap to shop",
          voiceover: "Tap to shop while the offer is live.",
          bgmMood: "bright finish"
        }
      ];

      return scriptSchema.parse({
        productId: input.product.id,
        templateId: null,
        title,
        narrative: `${input.templateName ?? templateNames[index] ?? "Auto"} script for a sub-15s conversion-focused product video.`,
        visualStyle: style,
        language: input.product.language,
        constraints: [
          "final video must be under 15 seconds",
          "show real product appearance when assets are available",
          "avoid competitor logos and unsupported claims"
        ],
        prompt: input.prompt ?? "",
        version: 1,
        shots
      });
    });
  }

  async generateShotVideo(input: VideoGenerationInput): Promise<VideoGenerationOutput> {
    return {
      provider: "mock",
      status: "fallback",
      note: `Mock clip generated for ${input.productTitle}: ${input.shot.visualPrompt}`
    };
  }

  async embed(text: string): Promise<number[]> {
    return seededVector(text);
  }
}

export class ArkAiProvider implements AiProvider {
  private client: OpenAI;
  private textModel: string;
  private videoModel: string;
  private embeddingModel?: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    if (!env.ARK_API_KEY) {
      throw new Error("ARK_API_KEY is required for ArkAiProvider");
    }
    this.client = new OpenAI({
      apiKey: env.ARK_API_KEY,
      baseURL: env.ARK_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/v3"
    });
    this.textModel = env.ARK_TEXT_MODEL ?? "";
    this.videoModel = env.ARK_VIDEO_MODEL ?? "";
    this.embeddingModel = env.ARK_EMBEDDING_MODEL;
  }

  async analyzeAsset(input: AssetAnalysisInput): Promise<AssetAnalysis> {
    const response = await this.client.chat.completions.create({
      model: this.textModel,
      messages: [
        {
          role: "system",
          content:
            "You structure ecommerce media assets. Return compact JSON with productTags, videoSummary, slices."
        },
        {
          role: "user",
          content: JSON.stringify(input)
        }
      ],
      response_format: { type: "json_object" }
    });
    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<AssetAnalysis>;
    const text = `${parsed.videoSummary ?? ""} ${(parsed.productTags ?? []).join(" ")}`;
    return {
      productTags: parsed.productTags ?? ["product", "aigc"],
      videoSummary: parsed.videoSummary ?? "Ark analysis completed.",
      slices: parsed.slices?.length
        ? parsed.slices
        : [{ startMs: 0, endMs: 3000, summary: "Product hero slice.", tags: ["hero"] }],
      embedding: normalizeEmbedding(await this.embed(text))
    };
  }

  async generateScripts(input: {
    product: ProductCreateInput & { id: string };
    prompt?: string;
    count: number;
    templateName?: string;
  }): Promise<ScriptModel[]> {
    const response = await this.client.chat.completions.create({
      model: this.textModel,
      messages: [
        {
          role: "system",
          content:
            "Generate ecommerce short-video scripts. Return JSON: { scripts: ScriptModel[] }. Each script needs 4-6 shots and total duration <= 15000ms."
        },
        {
          role: "user",
          content: JSON.stringify(input)
        }
      ],
      response_format: { type: "json_object" }
    });
    const raw = response.choices[0]?.message?.content ?? '{"scripts":[]}';
    const parsed = JSON.parse(raw) as { scripts?: unknown[] };
    return (parsed.scripts ?? []).slice(0, input.count).map((script) =>
      scriptSchema.parse({
        ...(script as Record<string, unknown>),
        productId: input.product.id,
        version: 1
      })
    );
  }

  async generateShotVideo(input: VideoGenerationInput): Promise<VideoGenerationOutput> {
    if (!this.videoModel) {
      throw new Error("ARK_VIDEO_MODEL is required for video generation");
    }

    const task = await (this.client as any).post("/contents/generations/tasks", {
      body: {
        model: this.videoModel,
        content: this.buildVideoContent(input),
        duration: Math.max(2, Math.min(5, Math.round(input.shot.durationMs / 1000))),
        ratio: input.aspectRatio === "HORIZONTAL_16_9" ? "16:9" : "9:16"
      },
      castTo: Object
    } as any);
    const createResult = await this.parseArkVideoTask(task);
    const taskId = createResult.taskId;
    if (!taskId) {
      return {
        provider: "ark",
        status: createResult.status,
        note: "Ark video task was submitted but no task id was returned.",
        raw: task,
        debugSample: createResult.debugSample
      };
    }

    const maxPolls = Number(process.env.ARK_VIDEO_MAX_POLLS ?? 12);
    const intervalMs = Number(process.env.ARK_VIDEO_POLL_INTERVAL_MS ?? 5000);
    for (let attempt = 0; attempt < maxPolls; attempt += 1) {
      await wait(intervalMs);
      const result = await (this.client as any).get(`/contents/generations/tasks/${taskId}`, {
        castTo: Object
      } as any);
      const pollResult = await this.parseArkVideoTask(result);
      const videoArtifact = pollResult.artifacts.find((artifact) => artifact.kind === "video");
      if (videoArtifact?.url) {
        return {
          provider: "ark",
          status: "succeeded",
          taskId,
          url: videoArtifact.url,
          note: "Ark video task completed and returned a video URL.",
          raw: result,
          debugSample: pollResult.debugSample
        };
      }
      if (["failed", "cancelled", "review_failed"].includes(pollResult.status)) {
        return {
          provider: "ark",
          status: pollResult.status,
          taskId,
          note: pollResult.message ?? `Ark video task ended with status ${pollResult.status}.`,
          raw: result,
          debugSample: pollResult.debugSample
        };
      }
    }

    return {
      provider: "ark",
      status: "submitted",
      taskId,
      note: "Ark video task is still processing; render will continue with local material-aware fallback."
    };
  }

  async embed(text: string): Promise<number[]> {
    if (!this.embeddingModel) {
      return normalizeEmbedding(seededVector(text));
    }
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: text
    });
    return normalizeEmbedding(response.data[0]?.embedding ?? seededVector(text));
  }

  private buildVideoContent(input: VideoGenerationInput) {
    const text = `${input.productTitle}. ${input.shot.visualPrompt}. ${input.shot.cameraMotion}. Subtitle: ${input.shot.subtitle}. Keep it ecommerce-safe and conversion-oriented.`;
    if (input.imageUrl) {
      return [
        { type: "text", text },
        { type: "image_url", image_url: { url: input.imageUrl } }
      ];
    }
    return [{ type: "text", text }];
  }

  private async parseArkVideoTask(payload: unknown): Promise<ArkVideoTaskPollResult> {
    const debugSample =
      process.env.ARK_VIDEO_DEBUG_SAMPLE === "true"
        ? (await writeArkVideoDebugSample(payload)).sample
        : redactPayloadShape(payload);
    const taskId = this.extractTaskId(payload);
    const status = this.normalizeTaskStatus(this.extractTaskStatus(payload));
    const artifacts = this.extractVideoArtifacts(payload);
    const { errorCode, message } = this.extractTaskError(payload);
    return { taskId, status, artifacts, errorCode, message, debugSample };
  }

  private extractTaskStatus(payload: unknown): string | undefined {
    return this.findFirstString(payload, ["status", "state", "phase"]);
  }

  private extractTaskId(payload: unknown): string | undefined {
    return this.findFirstString(payload, ["id", "task_id", "taskId", "taskID"]);
  }

  private extractVideoArtifacts(payload: unknown): ArkVideoArtifact[] {
    const artifacts: ArkVideoArtifact[] = [];
    const visit = (value: unknown, currentPath: string, depth: number) => {
      if (depth > 6) {
        return;
      }
      if (typeof value === "string" && /^https?:\/\//i.test(value)) {
        const lowerPath = currentPath.toLowerCase();
        const lowerValue = value.toLowerCase();
        if (/\.(mp4|mov|webm)(\?|$)/i.test(lowerValue) || lowerPath.includes("video")) {
          artifacts.push({ url: value, kind: "video", path: currentPath });
        } else if (lowerPath.includes("cover") || lowerPath.includes("poster")) {
          artifacts.push({ url: value, kind: "cover", path: currentPath });
        } else {
          artifacts.push({ url: value, kind: "unknown", path: currentPath });
        }
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item, index) => visit(item, `${currentPath}[${index}]`, depth + 1));
        return;
      }
      if (isRecord(value)) {
        for (const [key, nested] of Object.entries(value)) {
          visit(nested, currentPath ? `${currentPath}.${key}` : key, depth + 1);
        }
      }
    };
    visit(payload, "", 0);
    const unique = new Map(artifacts.map((artifact) => [artifact.url, artifact]));
    return [...unique.values()].sort((a, b) =>
      a.kind === "video" ? -1 : b.kind === "video" ? 1 : 0
    );
  }

  private extractTaskError(payload: unknown): { errorCode?: string; message?: string } {
    return {
      errorCode: this.findFirstString(payload, ["error_code", "errorCode", "code"]),
      message: this.findFirstString(payload, ["message", "error", "reason"])
    };
  }

  private findFirstString(payload: unknown, keys: string[]): string | undefined {
    const queue: unknown[] = [payload];
    const seen = new Set<unknown>();
    while (queue.length > 0) {
      const current = queue.shift();
      if (!isRecord(current) || seen.has(current)) {
        continue;
      }
      seen.add(current);
      for (const key of keys) {
        const value = current[key];
        if (typeof value === "string" && value.trim()) {
          return value.trim();
        }
        if (typeof value === "number") {
          return String(value);
        }
      }
      for (const value of Object.values(current)) {
        if (isRecord(value) || Array.isArray(value)) {
          queue.push(value);
        }
      }
      for (const value of Object.values(current)) {
        if (Array.isArray(value)) {
          value.forEach((item) => queue.push(item));
        }
      }
    }
    return undefined;
  }

  private normalizeTaskStatus(status?: string): ArkVideoTaskStatus {
    const normalized = (status ?? "submitted").toLowerCase().replace(/[\s-]/g, "_");
    if (["success", "succeeded", "completed", "done"].includes(normalized)) {
      return "succeeded";
    }
    if (["fail", "failed", "error"].includes(normalized)) {
      return "failed";
    }
    if (["content_review_failed", "review_failed", "audit_failed"].includes(normalized)) {
      return "review_failed";
    }
    if (["cancel", "cancelled", "canceled"].includes(normalized)) {
      return "cancelled";
    }
    if (["running", "processing", "generating"].includes(normalized)) {
      return "running";
    }
    if (["queued", "pending", "created"].includes(normalized)) {
      return "queued";
    }
    if (normalized === "submitted") {
      return "submitted";
    }
    return "unknown";
  }
}

export class MockTtsProvider implements TtsProvider {
  async synthesize(input: AudioSynthesisInput): Promise<AudioSynthesisOutput> {
    await mkdir(input.outputDir, { recursive: true });
    const filePath = path.join(
      input.outputDir,
      `tts-${Date.now()}-${seededVector(input.text, 1)[0]}.wav`
    );
    await writeFile(filePath, "");
    return {
      provider: "mock",
      filePath,
      durationMs: input.durationMs,
      status: "fallback",
      note: "Mock TTS placeholder requested; renderer will synthesize a local tone bed."
    };
  }
}

export class MockBgmProvider implements BgmProvider {
  async createBed(input: Omit<AudioSynthesisInput, "text">): Promise<AudioSynthesisOutput> {
    await mkdir(input.outputDir, { recursive: true });
    const filePath = path.join(input.outputDir, `bgm-${Date.now()}-${input.mood ?? "mood"}.wav`);
    await writeFile(filePath, "");
    return {
      provider: "mock",
      filePath,
      durationMs: input.durationMs,
      status: "fallback",
      note: "Mock BGM placeholder requested; renderer will synthesize a local music bed."
    };
  }
}

export class HybridAiProvider implements AiProvider {
  constructor(
    private primary: AiProvider,
    private fallback: AiProvider = new MockAiProvider()
  ) {}

  async analyzeAsset(input: AssetAnalysisInput): Promise<AssetAnalysis> {
    try {
      return await this.primary.analyzeAsset(input);
    } catch {
      return this.fallback.analyzeAsset(input);
    }
  }

  async generateScripts(input: {
    product: ProductCreateInput & { id: string };
    prompt?: string;
    count: number;
    templateName?: string;
  }): Promise<ScriptModel[]> {
    try {
      const scripts = await this.primary.generateScripts(input);
      return scripts.length ? scripts : this.fallback.generateScripts(input);
    } catch {
      return this.fallback.generateScripts(input);
    }
  }

  async generateShotVideo(input: VideoGenerationInput): Promise<VideoGenerationOutput> {
    try {
      return await this.primary.generateShotVideo(input);
    } catch {
      return this.fallback.generateShotVideo(input);
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      return await this.primary.embed(text);
    } catch {
      return this.fallback.embed(text);
    }
  }
}

export const createAiProvider = (env: NodeJS.ProcessEnv = process.env): AiProvider => {
  const mode = (env.AI_PROVIDER ?? "hybrid") as AiProviderMode;
  if (mode === "mock") {
    return new MockAiProvider();
  }
  if (mode === "ark") {
    return new ArkAiProvider(env);
  }
  try {
    return new HybridAiProvider(new ArkAiProvider(env), new MockAiProvider());
  } catch {
    return new MockAiProvider();
  }
};

export const createTtsProvider = (env: NodeJS.ProcessEnv = process.env): TtsProvider => {
  void env;
  return new MockTtsProvider();
};

export const createBgmProvider = (env: NodeJS.ProcessEnv = process.env): BgmProvider => {
  void env;
  return new MockBgmProvider();
};
