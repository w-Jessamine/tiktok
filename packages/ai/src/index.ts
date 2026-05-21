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
  note: string;
};

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
      const style = index === 1 ? "sunny lifestyle UGC" : index === 2 ? "macro detail editorial" : "fast benefit-led demo";
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
      embedding: await this.embed(text)
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
    const raw = response.choices[0]?.message?.content ?? "{\"scripts\":[]}";
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
    const response = await this.client.chat.completions.create({
      model: this.videoModel,
      messages: [
        {
          role: "user",
          content: `Create a short ecommerce video clip for ${input.productTitle}. Visual: ${input.shot.visualPrompt}. Aspect: ${input.aspectRatio}.`
        }
      ]
    });
    return {
      provider: "ark",
      taskId: response.id,
      note: "Ark video task submitted. Polling can be wired to the provider-specific video task API."
    };
  }

  async embed(text: string): Promise<number[]> {
    if (!this.embeddingModel) {
      return seededVector(text);
    }
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: text
    });
    return response.data[0]?.embedding ?? seededVector(text);
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
