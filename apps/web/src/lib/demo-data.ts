import type { GenerationJobDto } from "@videopilot/shared";
import type {
  AnalyticsFactor,
  AssetDto,
  ProductDto,
  ScriptDto,
  VideoExperimentDto,
  VideoExportDto
} from "./api";

const now = "2026-06-09T07:50:00.000Z";
const productId = "demo-glowlift-travel-serum";
const assetId = "demo-asset-serum-main";
const scriptId = "demo-script-serum-texture-proof";
const exportId = "demo-export-seedance-beauty";
const jobId = "demo-job-seedance-beauty";
const variantId = "demo-variant-texture-proof";
const experimentId = "demo-experiment-serum-ab";

const shots: ScriptDto["shots"] = [
  {
    id: "demo-shot-1",
    scriptId,
    order: 0,
    durationMs: 5000,
    visualPrompt:
      "Macro skincare counter shot: a hand lifts a clear serum dropper bottle, pale golden liquid visible, soft bathroom light, no readable label text.",
    cameraMotion: "slow macro push with natural hand motion",
    materialQuery: "serum dropper macro texture bathroom counter",
    subtitle: "Still dealing with this? fast-absorbing glow texture",
    voiceover:
      "Start with a close-up texture proof so shoppers understand the serum benefit without unsupported claims.",
    bgmMood: "clean beauty rhythm",
    selectedSliceId: "demo-slice-1",
    generatedUrl: "/demo/seedance-beauty.mp4"
  },
  {
    id: "demo-shot-2",
    scriptId,
    order: 1,
    durationMs: 2600,
    visualPrompt:
      "Show product packshot beside a travel pouch, then cut to a hand placing the bottle into the pouch.",
    cameraMotion: "handheld reveal to close-up",
    materialQuery: "travel mini serum bottle pouch packshot",
    subtitle: "Mini bottle, travel-pouch friendly",
    voiceover: "The compact format makes the product easy to carry through a rushed morning.",
    bgmMood: "light routine lift",
    selectedSliceId: "demo-slice-2",
    generatedUrl: null
  },
  {
    id: "demo-shot-3",
    scriptId,
    order: 2,
    durationMs: 2600,
    visualPrompt:
      "Hand texture test on the back of a hand, product remains visible in frame, no before-after face transformation.",
    cameraMotion: "small orbit with macro hold",
    materialQuery: "hand texture test no sticky finish",
    subtitle: "No sticky finish",
    voiceover:
      "A hand texture test gives a concrete proof moment without medical or efficacy claims.",
    bgmMood: "satisfying proof pop",
    selectedSliceId: "demo-slice-3",
    generatedUrl: null
  },
  {
    id: "demo-shot-4",
    scriptId,
    order: 3,
    durationMs: 2200,
    visualPrompt:
      "End with the bottle on a clean counter and a simple CTA card added by renderer, not generated into the footage.",
    cameraMotion: "locked packshot with gentle light movement",
    materialQuery: "clean packshot skincare CTA",
    subtitle: "Add it to your morning routine",
    voiceover: "Close with a routine upgrade CTA and source-safe wording.",
    bgmMood: "bright CTA finish",
    selectedSliceId: null,
    generatedUrl: null
  }
];

export const demoAssets: AssetDto[] = [
  {
    id: assetId,
    productId,
    type: "PRODUCT_VIDEO",
    filename: "glowlift-serum-seedance-proof.mp4",
    objectKey: "demo/seedance-beauty.mp4",
    url: "/demo/seedance-beauty.mp4",
    thumbnailUrl: "/demo/seedance-beauty.jpg",
    sourceStatement:
      "Demo product material plus two real Ark/Seedance generated shots; no public reference video is copied or remixed.",
    complianceStatus: "APPROVED",
    productTags: ["beauty", "texture", "dropper", "routine", "seedance"],
    videoSummary:
      "Real Seedance shot evidence for a skincare product: macro bottle motion, soft bathroom counter, subtitle-safe composition.",
    slices: [
      {
        id: "demo-slice-1",
        summary: "Macro serum bottle and dropper motion with product visible.",
        tags: ["macro", "dropper", "texture", "hook"],
        startMs: 0,
        endMs: 5000,
        thumbnailUrl: "/demo/seedance-beauty.jpg",
        isUsable: true
      },
      {
        id: "demo-slice-2",
        summary: "Travel-friendly packshot intent for the second storyboard beat.",
        tags: ["packshot", "travel", "mini-bottle"],
        startMs: 5000,
        endMs: 7600,
        thumbnailUrl: "/demo/seedance-beauty.jpg",
        isUsable: true
      },
      {
        id: "demo-slice-3",
        summary: "Texture proof intent for a safe hand demo without medical claims.",
        tags: ["texture", "hand-demo", "proof"],
        startMs: 7600,
        endMs: 10200,
        thumbnailUrl: "/demo/seedance-beauty.jpg",
        isUsable: true
      }
    ],
    score: 3
  }
];

export const demoScripts: ScriptDto[] = [
  {
    id: scriptId,
    productId,
    templateId: "texture-proof-beauty-v2",
    title: "GlowLift Travel Serum - Texture Proof",
    narrative:
      "Start with a sensory macro hook, show safe hands-on product proof, then close with a routine-upgrade CTA.",
    visualStyle: "beauty creator macro UGC with clean bathroom-counter lighting",
    language: "en-US",
    constraints: [
      "final video must be under 15 seconds",
      "product remains visible and recognizable",
      "no medical claims, fake reviews, readable fake labels or generated text overlays",
      "renderer owns subtitles and CTA overlays"
    ],
    prompt:
      "Premium but merchant-realistic skincare proof. Prioritize visible texture, product truth and compliance-safe wording.",
    version: 1,
    createdAt: now,
    updatedAt: now,
    shots
  }
];

export const demoExports: VideoExportDto[] = [
  {
    id: exportId,
    scriptId,
    aspectRatio: "VERTICAL_9_16",
    resolution: "720x1280",
    durationMs: 10023,
    fileUrl: "/demo/seedance-beauty.mp4",
    coverUrl: "/demo/seedance-beauty.jpg",
    renderSource: "ARK_GENERATED",
    config: {
      renderer: "ffmpeg",
      source: "ARK_GENERATED",
      materialCount: 2,
      provider: "ark",
      clipStats: {
        arkClips: 2,
        materialClips: 0,
        fallbackClips: 0,
        failedMaterialClips: 0,
        totalClips: 2
      }
    },
    createdAt: now
  }
];

export const demoJob: GenerationJobDto = {
  id: jobId,
  type: "VIDEO_GENERATION",
  status: "COMPLETED",
  progress: 100,
  productId,
  scriptId,
  input: {
    productId,
    scriptId,
    aspectRatio: "VERTICAL_9_16",
    resolution: "720x1280",
    voiceEnabled: false,
    bgmEnabled: false
  },
  output: {
    exportId,
    fileUrl: "/demo/seedance-beauty.mp4",
    coverUrl: "/demo/seedance-beauty.jpg",
    durationMs: 10023,
    source: "ARK_GENERATED"
  },
  trace: [
    {
      at: "2026-06-09T07:49:13.926Z",
      stage: "compile",
      message:
        "Shot prompt compiled from product truth, Texture Proof methodology, material hints and compliance constraints.",
      meta: {
        compilerVersion: "commerce-shot-v3",
        templateName: "Texture Proof",
        materialQuery: "serum dropper macro texture bathroom counter"
      }
    },
    {
      at: "2026-06-09T07:49:14.220Z",
      stage: "provider",
      message: "Ark/Seedance video task submitted with sanitized runtime diagnostics.",
      meta: {
        provider: "ark",
        videoMode: "ark-video-configured",
        nativeAudioRequested: false,
        taskIdShape: "cgt-...kfsl"
      }
    },
    {
      at: "2026-06-09T07:49:56.600Z",
      stage: "shot",
      message: "Seedance returned downloadable video artifacts for two storyboard shots.",
      meta: {
        status: "succeeded",
        artifactPath: "content.video_url",
        renderMaterialSource: "ark",
        selectedSliceIds: ["demo-slice-1", "demo-slice-2"]
      }
    },
    {
      at: "2026-06-09T07:49:58.392Z",
      stage: "render",
      message: "FFmpeg assembled two Ark clips with renderer-owned subtitle overlays.",
      meta: {
        source: "ARK_GENERATED",
        durationMs: 10023,
        resolution: "720x1280",
        clipStats: {
          arkClips: 2,
          materialClips: 0,
          fallbackClips: 0,
          failedMaterialClips: 0,
          totalClips: 2
        }
      }
    },
    {
      at: "2026-06-09T07:50:00.723Z",
      stage: "export",
      message: "Source-labeled Seedance export is ready for preview and submission evidence.",
      meta: {
        source: "ARK_GENERATED",
        fileUrl: "/demo/seedance-beauty.mp4",
        coverUrl: "/demo/seedance-beauty.jpg"
      }
    }
  ],
  error: null,
  retryCount: 0,
  createdAt: "2026-06-09T07:49:13.900Z",
  updatedAt: now
};

export const demoProducts: ProductDto[] = [
  {
    id: productId,
    title: "GlowLift Travel Serum",
    category: "Beauty / Skincare",
    sellingPoints: ["fast-absorbing glow texture", "no sticky finish", "travel-pouch friendly"],
    audience: "busy skincare shoppers and frequent travelers",
    scenario: "rushed morning skincare before commuting",
    productUrl: "https://example.com/products/glowlift-serum",
    language: "en-US",
    createdAt: now,
    assets: demoAssets,
    scripts: demoScripts
  }
];

export const demoExperiment: VideoExperimentDto = {
  id: experimentId,
  productId,
  goal: "Find the best conversion angle for a short TikTok Shop skincare video",
  status: "COMPLETED",
  variants: [
    {
      id: variantId,
      name: "Texture Proof",
      factors: {
        hook: "macro dropper texture close-up",
        visualStyle: "beauty creator macro UGC",
        cta: "routine upgrade",
        subtitleDensity: "medium",
        voiceTone: "calm premium"
      },
      metricSummary: {
        source: "seedance-demo-estimate",
        ctr: 0.074,
        cvr: 0.043,
        gmv: 1880
      },
      scriptId,
      jobId,
      exportId,
      generationJobs: [demoJob],
      exports: demoExports
    },
    {
      id: "demo-variant-pain-hook",
      name: "Pain Hook",
      factors: {
        hook: "rushed morning problem",
        visualStyle: "fast benefit-led demo",
        cta: "tap to solve it",
        subtitleDensity: "high",
        voiceTone: "direct"
      },
      metricSummary: {
        source: "mock-estimate",
        ctr: 0.066,
        cvr: 0.038,
        gmv: 1620
      },
      scriptId,
      jobId,
      exportId,
      generationJobs: [demoJob],
      exports: demoExports
    }
  ]
};

export const demoAnalytics: AnalyticsFactor[] = [
  {
    factor: "Texture Proof",
    impressions: 11800,
    clicks: 873,
    conversions: 38,
    ctr: 0.074,
    cvr: 0.0435,
    gmv: 1880,
    roi: 6.9,
    cpa: 6.84,
    aov: 49.47,
    spend: 260,
    watchSeconds: 10400,
    channels: ["seedance-demo"],
    sources: ["manual-demo"]
  },
  {
    factor: "Pain Hook",
    impressions: 12400,
    clicks: 818,
    conversions: 31,
    ctr: 0.066,
    cvr: 0.0379,
    gmv: 1620,
    roi: 5.8,
    cpa: 9.03,
    aov: 52.26,
    spend: 280,
    watchSeconds: 9300,
    channels: ["mock"],
    sources: ["seed"]
  },
  {
    factor: "Travel Mini Bottle",
    impressions: 9200,
    clicks: 552,
    conversions: 22,
    ctr: 0.06,
    cvr: 0.0399,
    gmv: 1120,
    roi: 4.9,
    cpa: 10.45,
    aov: 50.91,
    spend: 230,
    watchSeconds: 7100,
    channels: ["mock"],
    sources: ["seed"]
  }
];

export const demoIds = {
  productId,
  scriptId,
  jobId,
  experimentId
};
