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
    ]
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
    ]
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
    ]
  }
];

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
    order
  }));

  const compiledShots = selectedStoryboardShots.map((shot) => {
    const compiled = compileCommerceShotPrompt({
      product: demoCase.product,
      script: baseScript,
      shot: { ...shot, durationMs: 5000 },
      methodology: demoCase.methodology,
      platform: "tiktok_shop",
      assetHints: [...demoCase.assetHints, shot.materialQuery]
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
      results.push({
        prompt: shot.visualPrompt,
        shotOrder: shot.order,
        compilerTrace: compiledShots.find((item) => item.shot.order === shot.order)?.compiled.trace,
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
        compilerTrace: compiledShots.find((item) => item.shot.order === shot.order)?.compiled.trace,
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
