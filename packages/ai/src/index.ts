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
  nativeAudioRequested?: boolean;
  fallbackReason?: string;
  artifactPath?: string;
  artifactKind?: ArkVideoArtifact["kind"];
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

type CommerceScriptInput = {
  product: ProductCreateInput & { id: string };
  prompt?: string;
  count: number;
  templateName?: string;
};

type CommerceAngle = {
  name: string;
  narrative: string;
  visualStyle: string;
  hook: string;
  proof: string;
  proofVisual: string;
  proofMotion: string;
  cta: string;
  subtitleDensity: "low" | "medium" | "high";
  voiceTone: string;
};

export type CommerceCreativeMethodology = {
  templateId: string;
  templateName: string;
  strategy: string;
  factors: Record<string, string>;
  source: string;
  referencePolicy: string;
};

export type CommercePromptCompilerInput = {
  product: ProductCreateInput & { id: string };
  script: Pick<ScriptModel, "title" | "narrative" | "visualStyle" | "constraints">;
  shot: StoryboardShot;
  methodology: CommerceCreativeMethodology;
  platform?: "tiktok_shop" | "douyin_ecommerce";
  assetHints?: string[];
  productVisualSpec?: string;
  shotQualityPlan?: {
    mustShow?: string[];
    mustAvoid?: string[];
    motion?: string;
    composition?: string;
  };
};

export type CompiledCommerceShotPrompt = {
  prompt: string;
  trace: {
    compilerVersion: string;
    platform: "tiktok_shop" | "douyin_ecommerce";
    productId: string;
    templateId: string;
    templateName: string;
    strategy: string;
    factors: Record<string, string>;
    scriptTitle: string;
    shotOrder: number;
    materialQuery: string;
    assetHints: string[];
    constraints: string[];
    productVisualSpec?: string;
    shotQualityPlan?: CommercePromptCompilerInput["shotQualityPlan"];
  };
};

export const commerceScriptAngles: CommerceAngle[] = [
  {
    name: "Pain Point Rescue",
    narrative:
      "Open with a daily pain point, reveal the product as the fast fix, prove one concrete benefit, then close with an urgent shopping cue.",
    visualStyle: "Douyin-style fast problem-solution demo",
    hook: "pain-point cold open",
    proof: "hands-on feature proof",
    proofVisual: "show a hand applying or using the product, then cut to the first visible detail",
    proofMotion: "fast hand demo with snap zoom",
    cta: "tap to solve it today",
    subtitleDensity: "high",
    voiceTone: "direct and energetic"
  },
  {
    name: "Scene Seeding",
    narrative:
      "Place the product inside a relatable lifestyle scene, show natural usage, highlight texture or scale, and finish with a routine-upgrade CTA.",
    visualStyle: "first-person UGC lifestyle seeding",
    hook: "relatable first-person scene",
    proof: "usage process proof",
    proofVisual: "show the product moving through a real routine step by step",
    proofMotion: "first-person follow shot with soft jump cuts",
    cta: "add it to your routine",
    subtitleDensity: "medium",
    voiceTone: "friendly and conversational"
  },
  {
    name: "Proof Comparison",
    narrative:
      "Compress value through before/after contrast, feature detail, visible outcome and a concise offer close.",
    visualStyle: "split-screen comparison and proof cuts",
    hook: "before-after contrast",
    proof: "visible comparison proof",
    proofVisual: "show before/after or side-by-side comparison with the product in frame",
    proofMotion: "split-screen reveal with match cut",
    cta: "compare it yourself",
    subtitleDensity: "medium",
    voiceTone: "credible and specific"
  },
  {
    name: "Trust Offer",
    narrative:
      "Lead with product detail and source credibility, show the key selling point, then close on bundle or limited offer without overclaiming.",
    visualStyle: "clean retail packshot with trust cues",
    hook: "detail-first trust hook",
    proof: "packshot plus ingredient/material cue",
    proofVisual: "show packshot, material detail, label-safe cue, and careful close-up",
    proofMotion: "slow macro pan with premium hold",
    cta: "tap while the offer is live",
    subtitleDensity: "low",
    voiceTone: "calm and premium"
  }
];

export const buildCommerceScriptSystemPrompt = () =>
  [
    "You are a TikTok Shop / Douyin ecommerce short-video director.",
    "Generate conversion-focused product video scripts, not generic brand copy.",
    "Every script must follow this commerce rhythm: 0-3s hook, product reveal, proof/demo, usage payoff, CTA.",
    "Use concrete visual instructions that can drive text-to-video, image-to-video, or material-mix editing.",
    "Mention product truthfully; do not invent certifications, medical efficacy, guaranteed results, fake scarcity, fake reviews, or competitor names.",
    "Prefer visible proof: texture, scale, before/after organization, hands-on use, packshot, source statement, offer card.",
    'Return strict JSON only: { "scripts": ScriptModel[] }.',
    "Each ScriptModel needs 4-6 shots, total duration <= 15000ms, subtitle <= 90 chars, voiceover <= 220 chars."
  ].join(" ");

export const buildCommerceScriptUserPrompt = (input: CommerceScriptInput) =>
  JSON.stringify({
    product: input.product,
    requestedCount: input.count,
    merchantPrompt: input.prompt ?? "",
    preferredTemplate: input.templateName ?? "",
    platformPlaybook: {
      hooks: commerceScriptAngles.map((angle) => angle.hook),
      proofFactors: commerceScriptAngles.map((angle) => angle.proof),
      ctaOptions: commerceScriptAngles.map((angle) => angle.cta),
      requiredConstraints: [
        "show real product appearance when uploaded assets are available",
        "avoid unsupported absolute claims",
        "make the first shot understandable without sound",
        "keep the full export under 15 seconds",
        "include shot-level materialQuery for asset retrieval"
      ]
    }
  });

const clampLine = (text: string, maxLength: number) => {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(1, maxLength - 1)).trimEnd()}.`;
};

const sellingPoint = (product: ProductCreateInput, index: number, fallback: string) =>
  product.sellingPoints[index] ?? product.sellingPoints[0] ?? fallback;

const resolveAngles = (input: CommerceScriptInput) => {
  const preferred = input.templateName?.toLowerCase() ?? "";
  const prompt = input.prompt?.toLowerCase() ?? "";
  const scored = commerceScriptAngles
    .map((angle) => {
      const haystack =
        `${angle.name} ${angle.hook} ${angle.visualStyle} ${angle.cta}`.toLowerCase();
      return {
        angle,
        score:
          (preferred && haystack.includes(preferred) ? 3 : 0) +
          (prompt && prompt.split(/\s+/).some((word) => word.length > 3 && haystack.includes(word))
            ? 1
            : 0)
      };
    })
    .sort((a, b) => b.score - a.score);
  const ordered = scored.map((item) => item.angle);
  return [...ordered, ...commerceScriptAngles].filter(
    (angle, index, list) => list.findIndex((item) => item.name === angle.name) === index
  );
};

const createCommerceScript = (input: CommerceScriptInput, angle: CommerceAngle): ScriptModel => {
  const product = input.product;
  const primary = sellingPoint(product, 0, "main benefit");
  const secondary = sellingPoint(product, 1, "easy daily use");
  const tertiary = sellingPoint(product, 2, "visible quality detail");
  const audience = product.audience || "target shoppers";
  const scenario = product.scenario || "daily shopping scenario";
  const productTitle = product.title;

  const shots: StoryboardShot[] = [
    {
      order: 0,
      durationMs: 2200,
      visualPrompt: `${angle.hook}: show ${scenario} with an instantly recognizable shopper problem before revealing ${productTitle}.`,
      cameraMotion: "fast push-in with jump cut",
      materialQuery: `${product.category} hook problem scene ${scenario}`,
      subtitle: clampLine(`Still dealing with this? ${primary}`, 90),
      voiceover: clampLine(`${audience} know this problem. Here is the fast product fix.`, 220),
      bgmMood: "fast hook beat"
    },
    {
      order: 1,
      durationMs: 2600,
      visualPrompt: `Reveal ${productTitle} in hand or packshot, then demonstrate ${primary} with clear product visibility.`,
      cameraMotion: "handheld reveal to close-up",
      materialQuery: `${productTitle} packshot ${primary}`,
      subtitle: clampLine(primary, 90),
      voiceover: clampLine(`${productTitle} focuses on ${primary}, shown in a real-use demo.`, 220),
      bgmMood: "clean product pop"
    },
    {
      order: 2,
      durationMs: 2800,
      visualPrompt: `Show proof for ${secondary}: ${angle.proofVisual}. Keep ${productTitle} visible and avoid unsupported claims.`,
      cameraMotion: angle.proofMotion,
      materialQuery: `${secondary} ${angle.proof} product detail demo`,
      subtitle: clampLine(`Proof: ${secondary}`, 90),
      voiceover: clampLine(
        `The detail shot makes ${secondary} easy to understand without overclaiming.`,
        220
      ),
      bgmMood: "satisfying proof rhythm"
    },
    {
      order: 3,
      durationMs: 2800,
      visualPrompt: `Place the product naturally in ${scenario}; show the payoff for ${audience} using ${tertiary}.`,
      cameraMotion: "smooth pull-back to lifestyle scene",
      materialQuery: `${scenario} lifestyle payoff ${tertiary}`,
      subtitle: clampLine(`Fits ${scenario}`, 90),
      voiceover: clampLine(
        `It fits into ${scenario}, with ${tertiary} as the visible payoff.`,
        220
      ),
      bgmMood: "warm lift"
    },
    {
      order: 4,
      durationMs: 2400,
      visualPrompt: `End with product packshot, offer card, source-safe wording, and clear CTA: ${angle.cta}.`,
      cameraMotion: "locked packshot with CTA card",
      materialQuery: `${productTitle} packshot offer card CTA`,
      subtitle: clampLine(angle.cta, 90),
      voiceover: clampLine(`Tap to view ${productTitle} while the offer is live.`, 220),
      bgmMood: "bright CTA finish"
    }
  ];

  return scriptSchema.parse({
    productId: product.id,
    templateId: null,
    title: `${productTitle} - ${angle.name}`,
    narrative: angle.narrative,
    visualStyle: angle.visualStyle,
    language: product.language,
    constraints: [
      "final video must be under 15 seconds",
      "first three seconds must be understandable without sound",
      "show real product appearance when assets are available",
      "use product-specific proof instead of generic adjectives",
      "avoid unsupported efficacy, fake reviews, fake scarcity and competitor logos"
    ],
    prompt: [input.prompt, `Preset=${angle.name}; CTA=${angle.cta}; voice=${angle.voiceTone}`]
      .filter(Boolean)
      .join("\n"),
    version: 1,
    shots
  });
};

export const compileCommerceShotPrompt = (
  input: CommercePromptCompilerInput
): CompiledCommerceShotPrompt => {
  const platform = input.platform ?? "tiktok_shop";
  const productTruths = [
    `title=${input.product.title}`,
    `category=${input.product.category}`,
    `audience=${input.product.audience}`,
    `scene=${input.product.scenario}`,
    `selling_points=${input.product.sellingPoints.join(" | ")}`
  ];
  const factorLine = Object.entries(input.methodology.factors)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
  const constraints = [
    ...input.script.constraints,
    "vertical 9:16 ecommerce shot",
    "product remains visible and recognizable",
    "no burned-in fake app UI, no fake review, no unsupported discount or efficacy claim",
    "no readable brand logos, no gibberish labels, no subtitles or UI text inside the generated footage",
    "avoid morphing product category, color, size, or material during the shot"
  ];
  const assetHints = input.assetHints?.length
    ? input.assetHints
    : [input.shot.materialQuery, input.product.category, input.product.scenario];
  const compactConstraints = [...new Set(constraints)].slice(0, 8);
  const qualityPlan = input.shotQualityPlan ?? {};
  const productVisualSpec =
    input.productVisualSpec ??
    `${input.product.title} must stay recognizable as a ${input.product.category} product with merchant-safe appearance and realistic scale.`;
  const mustShow = qualityPlan.mustShow?.length
    ? qualityPlan.mustShow
    : [
        `clear product identity for ${input.product.title}`,
        "one visible hands-on usage action",
        "realistic ecommerce lighting and scale"
      ];
  const mustAvoid = qualityPlan.mustAvoid?.length
    ? qualityPlan.mustAvoid
    : [
        "extra invented logos or fake app UI",
        "unreadable printed words",
        "product changing into a different object"
      ];
  const prompt = [
    platform === "douyin_ecommerce"
      ? "Douyin ecommerce short-video shot."
      : "TikTok Shop ecommerce short-video shot.",
    "Generate one realistic UGC-style merchant product segment, not a generic stock clip or static packshot.",
    "Prioritize real video motion: hands interact with the product, camera moves naturally, and the product remains in frame.",
    `Product truth: ${productTruths.join("; ")}.`,
    `Product visual identity lock: ${productVisualSpec}`,
    `Methodology: ${input.methodology.templateName}; strategy=${input.methodology.strategy}; factors=${factorLine}.`,
    `Script: ${input.script.title}; style=${input.script.visualStyle}; narrative=${input.script.narrative}.`,
    `Shot: order=${input.shot.order}; visual=${input.shot.visualPrompt}; camera=${input.shot.cameraMotion}; subtitle_intent=${input.shot.subtitle}.`,
    `Material intent: ${assetHints.join(" | ")}.`,
    `Must show: ${mustShow.join("; ")}.`,
    `Must avoid: ${mustAvoid.join("; ")}.`,
    qualityPlan.motion ? `Motion target: ${qualityPlan.motion}.` : "",
    qualityPlan.composition ? `Composition target: ${qualityPlan.composition}.` : "",
    `Constraints: ${compactConstraints.join("; ")}.`,
    "Keep the clip cinematic but merchant-realistic; subtitles and CTA overlays are added later by the renderer, so do not generate text overlays."
  ]
    .filter(Boolean)
    .join(" ");

  return {
    prompt,
    trace: {
      compilerVersion: "commerce-shot-v2",
      platform,
      productId: input.product.id,
      templateId: input.methodology.templateId,
      templateName: input.methodology.templateName,
      strategy: input.methodology.strategy,
      factors: input.methodology.factors,
      scriptTitle: input.script.title,
      shotOrder: input.shot.order,
      materialQuery: input.shot.materialQuery,
      assetHints,
      constraints,
      productVisualSpec,
      shotQualityPlan: qualityPlan
    }
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const isPublicHttpUrl = (url?: string | null) => Boolean(url && /^https?:\/\//i.test(url));

const isLikelyImageUrl = (url?: string | null) =>
  Boolean(url && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url));

const compactVideoPrompt = (
  text: string,
  maxLength = Number(process.env.ARK_VIDEO_PROMPT_MAX_CHARS ?? 1450)
) => {
  const normalized = text
    .replace(/\s+/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(1, maxLength - 1)).trimEnd()}.`;
};

const sanitizeErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/ark-[A-Za-z0-9-]+/g, "ark-***")
    .replace(/ep-\d{14}-[A-Za-z0-9]+/g, "ep-***")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***")
    .slice(0, 320);
};

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

export const parseArkVideoTaskPayload = async (payload: unknown, saveDebugSample = false) => {
  const debugSample =
    saveDebugSample && process.env.ARK_VIDEO_DEBUG_SAMPLE === "true"
      ? (await writeArkVideoDebugSample(payload)).sample
      : redactPayloadShape(payload);
  return {
    taskId: extractArkTaskId(payload),
    status: normalizeArkTaskStatus(extractArkTaskStatus(payload)),
    artifacts: extractArkVideoArtifacts(payload),
    ...extractArkTaskError(payload),
    debugSample
  } satisfies ArkVideoTaskPollResult;
};

const extractArkTaskStatus = (payload: unknown): string | undefined =>
  findFirstString(payload, ["status", "state", "phase"]);

const extractArkTaskId = (payload: unknown): string | undefined =>
  findFirstString(payload, ["id", "task_id", "taskId", "taskID"]);

const extractArkVideoArtifacts = (payload: unknown): ArkVideoArtifact[] => {
  const artifacts: ArkVideoArtifact[] = [];
  const visit = (value: unknown, currentPath: string, depth: number) => {
    if (depth > 6) {
      return;
    }
    if (typeof value === "string" && /^https?:\/\//i.test(value)) {
      const lowerPath = currentPath.toLowerCase();
      const lowerValue = value.toLowerCase();
      const looksLikeCover =
        lowerPath.includes("cover") ||
        lowerPath.includes("poster") ||
        lowerPath.includes("thumbnail") ||
        /\.(png|jpe?g|webp|gif)(\?|$)/i.test(lowerValue);
      const looksLikeVideo =
        /\.(mp4|mov|webm|m3u8)(\?|$)/i.test(lowerValue) ||
        ((lowerPath.includes("video_url") ||
          lowerPath.endsWith(".video") ||
          lowerPath.endsWith(".url")) &&
          !looksLikeCover);
      if (looksLikeCover) {
        artifacts.push({ url: value, kind: "cover", path: currentPath });
      } else if (looksLikeVideo) {
        artifacts.push({ url: value, kind: "video", path: currentPath });
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
};

const extractArkTaskError = (payload: unknown): { errorCode?: string; message?: string } => ({
  errorCode: findFirstString(payload, ["error_code", "errorCode", "code"]),
  message: findFirstString(payload, ["message", "error", "reason"])
});

const findFirstString = (payload: unknown, keys: string[]): string | undefined => {
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
};

const normalizeArkTaskStatus = (status?: string): ArkVideoTaskStatus => {
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
    const angles = resolveAngles(input);
    return Array.from({ length: input.count }, (_, index) => {
      return createCommerceScript(input, angles[index % angles.length]!);
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
          content: buildCommerceScriptSystemPrompt()
        },
        {
          role: "user",
          content: buildCommerceScriptUserPrompt(input)
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
        duration: this.resolveVideoDuration(input.shot.durationMs),
        ratio: input.aspectRatio === "HORIZONTAL_16_9" ? "16:9" : "9:16",
        resolution: process.env.ARK_VIDEO_RESOLUTION ?? "720p",
        ...this.buildNativeAudioRequest()
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
          note: this.shouldGenerateNativeAudio()
            ? "Ark video task completed and returned a video URL; native audio was requested."
            : "Ark video task completed and returned a video URL.",
          nativeAudioRequested: this.shouldGenerateNativeAudio(),
          artifactPath: videoArtifact.path,
          artifactKind: videoArtifact.kind,
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
      note: "Ark video task is still processing; render will continue with local material-aware fallback.",
      fallbackReason: "ARK_VIDEO_TASK_STILL_PROCESSING"
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
    const text = compactVideoPrompt(
      [
        input.productTitle,
        input.shot.visualPrompt,
        input.shot.cameraMotion,
        `Subtitle intent: ${input.shot.subtitle}`,
        "Ecommerce-safe UGC video; realistic motion; product visible; no generated text overlays."
      ].join(". ")
    );
    if (isPublicHttpUrl(input.imageUrl) && isLikelyImageUrl(input.imageUrl)) {
      return [
        { type: "text", text },
        { type: "image_url", image_url: { url: input.imageUrl } }
      ];
    }
    return [{ type: "text", text }];
  }

  private resolveVideoDuration(shotDurationMs: number) {
    const explicitDuration = Number(process.env.ARK_VIDEO_DURATION);
    if ([5, 10, 12].includes(explicitDuration)) {
      return explicitDuration;
    }
    const requestedSeconds = Math.max(5, Math.round(shotDurationMs / 1000));
    return [5, 10, 12].find((duration) => duration >= requestedSeconds) ?? 12;
  }

  private shouldGenerateNativeAudio() {
    return process.env.ARK_VIDEO_GENERATE_AUDIO === "true";
  }

  private buildNativeAudioRequest() {
    if (!this.shouldGenerateNativeAudio()) {
      return {};
    }
    return {
      generate_audio: true,
      with_audio: true
    };
  }

  private async parseArkVideoTask(payload: unknown): Promise<ArkVideoTaskPollResult> {
    return parseArkVideoTaskPayload(payload, true);
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
    } catch (error) {
      const fallback = await this.fallback.generateShotVideo(input);
      const reason = sanitizeErrorMessage(error);
      return {
        ...fallback,
        note: `${fallback.note} Primary Ark attempt failed; using mock fallback. Reason: ${reason}`,
        fallbackReason: reason
      };
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
