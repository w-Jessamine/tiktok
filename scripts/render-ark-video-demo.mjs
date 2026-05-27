import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import {
  ArkAiProvider,
  MockAiProvider,
  compileCommerceShotPrompt
} from "../packages/ai/dist/ai/src/index.js";
import { renderStoryboardVideo } from "../packages/video/dist/video/src/index.js";

const outputRoot = path.resolve(process.cwd(), "storage", "demo-ark-seedance");
const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);

const getArgValue = (name) => {
  const prefix = `${name}=`;
  const inline = rawArgs.find((arg) => arg.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }
  const index = rawArgs.indexOf(name);
  return index >= 0 ? rawArgs[index + 1] : undefined;
};

const shotCount = args.has("--one-shot") ? 1 : args.has("--two-shots") ? 2 : 3;
const reuseExisting = args.has("--reuse-existing");
const runAllCases = args.has("--all-cases");
const selectedCaseId = getArgValue("--case");
const useArkScriptProvider = args.has("--ark-script");
const selectedShotOrder = Number(getArgValue("--shot") ?? Number.NaN);

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is required. Set it in your shell or secret manager, not in repo files.`
    );
  }
  return value;
};

const redactUrl = (url) => {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}${parsed.search ? "?..." : ""}`;
  } catch {
    return "unparseable-url";
  }
};

const downloadVideo = async (url, filePath) => {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Download failed with ${response.status} ${response.statusText}`);
  }
  await pipeline(response.body, createWriteStream(filePath));
};

const assertExistingClip = async (filePath) => {
  const fileStat = await stat(filePath).catch(() => undefined);
  if (!fileStat?.isFile() || fileStat.size <= 0) {
    throw new Error(
      `Missing reusable Ark clip: ${filePath}. Run pnpm demo:ark-video -- --case=<id> once without --reuse-existing first.`
    );
  }
};

const demoCases = [
  {
    id: "storage",
    product: {
      id: "demo-snap-sort-drawer-organizer",
      title: "SnapSort Drawer Organizer",
      category: "Home organization",
      sellingPoints: [
        "visible before-and-after drawer reset",
        "adjustable compartments for small daily items",
        "clean product scale and material texture"
      ],
      audience: "busy renters and small-space home shoppers",
      scenario: "resetting a messy desk or bedroom drawer before work",
      productUrl: "https://example.com/products/snapsort-drawer-organizer",
      language: "en-US"
    },
    methodology: {
      templateId: "pain-point-rescue-home-storage-v2",
      templateName: "Pain Point Rescue",
      strategy:
        "Open with a relatable messy-drawer pain point, prove the organizer through hands-on sorting, then close on a practical upgrade CTA.",
      factors: {
        hook: "messy drawer cold open",
        proof: "before-after organization and compartment close-up",
        camera: "first-person UGC handheld movement",
        cta: "routine upgrade CTA without fake urgency",
        subtitle: "short benefit captions added by renderer"
      },
      source:
        "Built-in compliant ecommerce methodology library, derived from abstracted viral-video patterns.",
      referencePolicy:
        "No public reference video is copied or remixed; only the abstract strategy/factor recipe is used."
    },
    scriptPrompt:
      "Create a concrete home-organization TikTok Shop storyboard with visible product proof, no fake discount claims, and strong shot-level material queries.",
    assetHints: [
      "merchant-owned product main image: white adjustable drawer organizer",
      "merchant-owned product video: hand sorting small desk and drawer items"
    ],
    productVisualSpec:
      "A translucent or matte white modular drawer organizer tray with rectangular adjustable compartments, placed inside a wooden desk drawer; no text or logo on the product.",
    shotQualityPlans: {
      0: {
        mustShow: [
          "messy drawer before state",
          "hand opening or resetting the drawer",
          "organizer tray visible as a storage product"
        ],
        mustAvoid: [
          "turning the product into a generic storage box",
          "fake app UI or readable labels",
          "unrelated room decor dominating the frame"
        ],
        motion: "first-person hand opens drawer, quick push-in, product enters frame",
        composition:
          "vertical phone video, desk drawer centered, hands and product large enough to inspect"
      },
      1: {
        mustShow: [
          "organized drawer after state",
          "rectangular compartments holding small daily items",
          "clean packshot-like final moment"
        ],
        mustAvoid: [
          "loose random clutter without organizer compartments",
          "invented discount text",
          "product disappearing behind the drawer"
        ],
        motion: "hand slides drawer or adjusts one compartment, then holds for final product proof",
        composition: "drawer and organizer occupy the center two thirds of the vertical frame"
      }
    }
  },
  {
    id: "beauty",
    product: {
      id: "demo-glowlift-travel-serum",
      title: "GlowLift Travel Serum",
      category: "Beauty skincare",
      sellingPoints: [
        "fast-absorbing glow texture",
        "no sticky finish",
        "travel pouch friendly mini bottle"
      ],
      audience: "busy skincare shoppers and frequent travelers",
      scenario: "rushed morning skincare before commuting",
      productUrl: "https://example.com/products/glowlift-travel-serum",
      language: "en-US"
    },
    methodology: {
      templateId: "texture-proof-beauty-v2",
      templateName: "Texture Proof",
      strategy:
        "Start with a close-up sensory texture hook, show a safe hands-on application proof, then end on a compact routine CTA.",
      factors: {
        hook: "macro dropper texture close-up",
        proof: "hand texture test and quick absorption visual",
        camera: "beauty creator macro handheld with clean bathroom counter",
        cta: "routine upgrade CTA without medical claims",
        subtitle: "benefit captions added by renderer"
      },
      source:
        "Built-in compliant ecommerce methodology library, derived from abstracted viral-video patterns.",
      referencePolicy:
        "No public reference video is copied or remixed; only the abstract strategy/factor recipe is used."
    },
    scriptPrompt:
      "Create a skincare TikTok Shop storyboard with texture proof, clean product visibility, no medical claims, and no before-after skin efficacy claim.",
    assetHints: [
      "merchant-owned product main image: small serum bottle with dropper",
      "merchant-owned product video: serum texture on hand under soft bathroom light"
    ],
    productVisualSpec:
      "A small clear glass serum bottle with pale golden liquid and a plain white dropper cap, shown on a clean bathroom counter; no brand text, no medical visuals.",
    shotQualityPlans: {
      0: {
        mustShow: [
          "clear serum bottle or dropper in the first seconds",
          "macro liquid texture or dropper motion",
          "clean skincare counter setting"
        ],
        mustAvoid: [
          "before-after face transformation",
          "medical or clinical equipment",
          "readable fake label text"
        ],
        motion: "hand lifts dropper, liquid moves naturally, slight macro camera push",
        composition: "serum bottle and hand fill most of the frame with soft bathroom light"
      },
      1: {
        mustShow: [
          "plain serum bottle packshot",
          "dropper cap or texture proof",
          "premium clean countertop finish"
        ],
        mustAvoid: [
          "invented skin efficacy claim",
          "fake star reviews or sale stickers",
          "label text that looks like gibberish"
        ],
        motion: "slow hand placement or dropper close-up, then steady packshot hold",
        composition: "bottle centered, minimal background, no text inside generated footage"
      }
    }
  },
  {
    id: "kitchen",
    product: {
      id: "demo-miniblend-portable-blender",
      title: "MiniBlend Portable Blender",
      category: "Kitchen appliance",
      sellingPoints: [
        "single-serve smoothie in a compact cup",
        "easy rinse detachable cup",
        "desk and gym bag friendly size"
      ],
      audience: "office workers and post-workout shoppers",
      scenario: "making a quick desk smoothie after a workout",
      productUrl: "https://example.com/products/miniblend-portable-blender",
      language: "en-US"
    },
    methodology: {
      templateId: "scene-seeding-kitchen-v2",
      templateName: "Scene Seeding",
      strategy:
        "Open with an everyday snack moment, show ingredient-to-result transformation, and close on practical portability proof.",
      factors: {
        hook: "desk smoothie problem scene",
        proof: "ingredients blending and rinse demo",
        camera: "first-person UGC kitchen-to-desk cuts",
        cta: "practical routine CTA without fake scarcity",
        subtitle: "short benefit captions added by renderer"
      },
      source:
        "Built-in compliant ecommerce methodology library, derived from abstracted viral-video patterns.",
      referencePolicy:
        "No public reference video is copied or remixed; only the abstract strategy/factor recipe is used."
    },
    scriptPrompt:
      "Create a portable blender TikTok Shop storyboard with real usage proof, ingredient motion, portability, no fake discount, and clear product scale.",
    assetHints: [
      "merchant-owned product main image: compact portable blender cup",
      "merchant-owned product video: fruit pieces blending into a smoothie"
    ],
    productVisualSpec:
      "A compact portable blender cup with a transparent mixing jar, visible fruit pieces or smoothie inside, and a simple black or white motor base; it must not look like a thermos, speaker, tumbler, or coffee cup.",
    shotQualityPlans: {
      0: {
        mustShow: [
          "transparent blender cup with fruit or smoothie visible",
          "hand adding fruit or pressing blender button",
          "desk or kitchen context for a quick smoothie"
        ],
        mustAvoid: [
          "opaque bottle or thermos shape",
          "nonsense vertical brand lettering",
          "laptop-only scene with no blending action"
        ],
        motion: "fruit drops into cup, hand presses button, liquid swirls or cup vibrates slightly",
        composition:
          "portable blender cup centered and tall in vertical frame, transparent jar clearly visible"
      },
      1: {
        mustShow: [
          "finished smoothie inside transparent cup",
          "detachable cup or easy rinse implication",
          "portable scale near hand or desk"
        ],
        mustAvoid: [
          "turning into a plain travel mug",
          "invented readable logo text",
          "black cylinder with no transparent jar"
        ],
        motion: "hand lifts blender cup or rinses detachable cup, then holds for product proof",
        composition:
          "product fills center of frame, jar and motor base both visible, no generated text overlays"
      }
    }
  }
];

const buildRenderCriticPlan = ({ demoCase, shot, compiled }) => {
  const plan = demoCase.shotQualityPlans?.[shot.order] ?? {};
  const mustShow = plan.mustShow ?? [];
  const mustAvoid = plan.mustAvoid ?? [];
  return {
    version: "render-critic-plan-v1",
    caseId: demoCase.id,
    shotOrder: shot.order,
    productTitle: demoCase.product.title,
    productVisualSpec: demoCase.productVisualSpec,
    expectedEvidence: mustShow,
    rejectIfSeen: mustAvoid,
    motionTarget: plan.motion,
    compositionTarget: plan.composition,
    rerunGuidance: [
      "rerun if product category changes or product is not visible",
      "rerun if generated text/logos dominate the frame",
      "rerun if the clip is mostly static and lacks the expected hands-on action",
      "rerun if subtitle-safe area is visually too busy"
    ],
    compilerVersion: compiled?.trace?.compilerVersion ?? "unknown"
  };
};

const getCasesToRun = () => {
  if (runAllCases) {
    return demoCases;
  }
  if (selectedCaseId) {
    const found = demoCases.find((item) => item.id === selectedCaseId);
    if (!found) {
      throw new Error(
        `Unknown --case=${selectedCaseId}. Available cases: ${demoCases
          .map((item) => item.id)
          .join(", ")}`
      );
    }
    return [found];
  }
  return [demoCases[0]];
};

const selectDemoShots = (shots) => {
  if (Number.isInteger(selectedShotOrder)) {
    return [
      shots.find((shot) => shot.order === selectedShotOrder) ?? shots[selectedShotOrder]
    ].filter(Boolean);
  }
  if (shotCount === 1) {
    return [shots[0]].filter(Boolean);
  }
  if (shotCount === 2) {
    return [shots[0], shots.at(-1)].filter(Boolean);
  }
  return [shots[0], shots[2] ?? shots[1], shots.at(-1)].filter(Boolean);
};

const renderCase = async (demoCase) => {
  const caseOutputRoot = path.join(outputRoot, demoCase.id);
  await mkdir(caseOutputRoot, { recursive: true });

  const shouldUseArkScriptProvider =
    useArkScriptProvider &&
    !reuseExisting &&
    Boolean(process.env.ARK_API_KEY && process.env.ARK_TEXT_MODEL);
  const scriptProvider = shouldUseArkScriptProvider
    ? new ArkAiProvider(process.env)
    : new MockAiProvider();
  const [baseScript] = await scriptProvider.generateScripts({
    product: demoCase.product,
    count: 1,
    templateName: demoCase.methodology.templateName,
    prompt: demoCase.scriptPrompt
  });

  if (!baseScript) {
    throw new Error(`Failed to create the demo commerce script for ${demoCase.id}.`);
  }

  const selectedStoryboardShots = selectDemoShots(baseScript.shots).map((shot, order) => ({
    ...shot,
    order: Number.isInteger(selectedShotOrder) ? shot.order : order
  }));

  const compiledShots = selectedStoryboardShots.map((shot) => {
    const compiled = compileCommerceShotPrompt({
      product: demoCase.product,
      script: baseScript,
      shot: { ...shot, durationMs: 5000 },
      methodology: demoCase.methodology,
      platform: "tiktok_shop",
      assetHints: [...demoCase.assetHints, shot.materialQuery],
      productVisualSpec: demoCase.productVisualSpec,
      shotQualityPlan: demoCase.shotQualityPlans?.[shot.order]
    });
    return {
      originalShot: shot,
      compiled,
      shot: {
        ...shot,
        durationMs: 5000,
        visualPrompt: compiled.prompt
      }
    };
  });

  const shots = compiledShots.map((item) => item.shot);
  const results = [];

  if (reuseExisting) {
    for (const shot of shots) {
      const existing = path.join(caseOutputRoot, `ark-shot-${shot.order + 1}.mp4`);
      await assertExistingClip(existing);
      const compiledItem = compiledShots.find((item) => item.shot.order === shot.order);
      results.push({
        prompt: shot.visualPrompt,
        shotOrder: shot.order,
        compilerTrace: compiledItem?.compiled.trace,
        renderCriticPlan: buildRenderCriticPlan({
          demoCase,
          shot,
          compiled: compiledItem?.compiled
        }),
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        provider: "ark",
        status: "succeeded",
        hasUrl: false,
        nativeAudioRequested: process.env.ARK_VIDEO_GENERATE_AUDIO === "true",
        downloaded: true,
        filePath: existing,
        note: "Reused an existing local Ark clip for stitching validation."
      });
    }
  } else {
    requireEnv("ARK_API_KEY");
    requireEnv("ARK_VIDEO_MODEL");
    const provider = new ArkAiProvider(process.env);
    for (const shot of shots) {
      const compiledItem = compiledShots.find((item) => item.shot.order === shot.order);
      const startedAt = new Date().toISOString();
      const output = await provider.generateShotVideo({
        shot,
        productTitle: demoCase.product.title,
        aspectRatio: "VERTICAL_9_16"
      });
      const fileName = `ark-shot-${shot.order + 1}-${Date.now()}.mp4`;
      const filePath = path.join(caseOutputRoot, fileName);
      let downloaded = false;
      if (output.url) {
        await downloadVideo(output.url, filePath);
        downloaded = true;
        await copyFile(filePath, path.join(caseOutputRoot, `ark-shot-${shot.order + 1}.mp4`));
      }
      results.push({
        prompt: shot.visualPrompt,
        shotOrder: shot.order,
        compilerTrace: compiledItem?.compiled.trace,
        renderCriticPlan: buildRenderCriticPlan({
          demoCase,
          shot,
          compiled: compiledItem?.compiled
        }),
        startedAt,
        finishedAt: new Date().toISOString(),
        provider: output.provider,
        status: output.status,
        hasUrl: Boolean(output.url),
        nativeAudioRequested: output.nativeAudioRequested,
        downloaded,
        filePath: downloaded ? filePath : undefined,
        redactedUrl: output.url ? redactUrl(output.url) : undefined,
        taskIdShape: output.taskId
          ? `${output.taskId.slice(0, 4)}...${output.taskId.slice(-4)}`
          : undefined,
        artifactPath: output.artifactPath,
        note: output.note,
        fallbackReason: output.fallbackReason,
        debugSample: output.debugSample
      });
    }
  }

  const downloadedResults = results.filter((result) => result.downloaded && result.filePath);
  let finalExport;
  if (downloadedResults.length > 0) {
    finalExport = await renderStoryboardVideo({
      scriptTitle: `${demoCase.product.title} Ark Seedance Demo`,
      shots,
      aspectRatio: "VERTICAL_9_16",
      outputDir: path.join(caseOutputRoot, "final"),
      materials: downloadedResults.map((result) => ({
        shotOrder: result.shotOrder,
        url: result.filePath,
        kind: "remote-video",
        source: "ark"
      })),
      audio: {
        voiceEnabled: false,
        bgmEnabled: false,
        preserveSourceAudio: true,
        bgmMood: "upbeat",
        bgmVolume: 0.08
      }
    });
  }

  const manifestPath = path.join(caseOutputRoot, `manifest-${Date.now()}.json`);
  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        caseId: demoCase.id,
        productTitle: demoCase.product.title,
        product: demoCase.product,
        script: {
          title: baseScript.title,
          narrative: baseScript.narrative,
          visualStyle: baseScript.visualStyle,
          constraints: baseScript.constraints,
          selectedShotOrders: selectedStoryboardShots.map((shot) => shot.order),
          source: shouldUseArkScriptProvider
            ? "generated_by_ark_text_model_from_product_and_methodology"
            : "generated_by_local_template_provider_from_product_and_methodology"
        },
        methodology: demoCase.methodology,
        promptCompiler: {
          version: "commerce-shot-v2",
          summary:
            "Each Ark/Seedance prompt is compiled from product truth, methodology strategy/factors, generated storyboard shots, asset retrieval hints and compliance constraints."
        },
        mode: reuseExisting ? "reuse-existing" : "ark-generate",
        modelConfigured: Boolean(process.env.ARK_VIDEO_MODEL),
        nativeAudioPolicy: {
          requested: process.env.ARK_VIDEO_GENERATE_AUDIO === "true",
          renderer:
            "preserve Ark/Seedance source audio for ARK_GENERATED clips; use local TTS/BGM only when explicitly enabled or when using material/fallback paths"
        },
        expectedRenderSource:
          finalExport?.renderSource ?? (downloadedResults.length > 0 ? "HYBRID_MIX" : "FAILED"),
        finalExport: finalExport
          ? {
              filePath: finalExport.filePath,
              coverPath: finalExport.coverPath,
              durationMs: finalExport.durationMs,
              resolution: finalExport.resolution,
              renderSource: finalExport.renderSource,
              clipStats: finalExport.clipStats
            }
          : undefined,
        results
      },
      null,
      2
    )
  );

  return { caseId: demoCase.id, manifestPath, finalExport, results };
};

await mkdir(outputRoot, { recursive: true });

const caseOutputs = [];
for (const demoCase of getCasesToRun()) {
  caseOutputs.push(await renderCase(demoCase));
}

console.log(JSON.stringify({ cases: caseOutputs }, null, 2));

if (
  caseOutputs.some(
    (caseOutput) =>
      !caseOutput.finalExport || caseOutput.results.some((result) => !result.downloaded)
  )
) {
  process.exitCode = 1;
}
