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
const args = new Set(process.argv.slice(2));
const shotCount = args.has("--one-shot") ? 1 : args.has("--two-shots") ? 2 : 3;
const reuseExisting = args.has("--reuse-existing");

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
      `Missing reusable Ark clip: ${filePath}. Run pnpm demo:ark-video once without --reuse-existing first.`
    );
  }
};

await mkdir(outputRoot, { recursive: true });

const product = {
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
};

const methodology = {
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
};

const shouldUseArkScriptProvider =
  !reuseExisting && Boolean(process.env.ARK_API_KEY && process.env.ARK_TEXT_MODEL);
const scriptProvider = shouldUseArkScriptProvider
  ? new ArkAiProvider(process.env)
  : new MockAiProvider();
const [baseScript] = await scriptProvider.generateScripts({
  product,
  count: 1,
  templateName: methodology.templateName,
  prompt:
    "Create a concrete home-organization TikTok Shop storyboard with visible product proof, no medical or fake discount claims, and strong shot-level material queries."
});

if (!baseScript) {
  throw new Error("Failed to create the demo commerce script.");
}

const selectDemoShots = (shots) => {
  if (shotCount === 1) {
    return [shots[0]].filter(Boolean);
  }
  if (shotCount === 2) {
    return [shots[0], shots.at(-1)].filter(Boolean);
  }
  return [shots[0], shots[2] ?? shots[1], shots.at(-1)].filter(Boolean);
};

const selectedStoryboardShots = selectDemoShots(baseScript.shots).map((shot, order) => ({
  ...shot,
  order
}));

const compiledShots = selectedStoryboardShots.map((shot) => {
  const compiled = compileCommerceShotPrompt({
    product,
    script: baseScript,
    shot: { ...shot, durationMs: 5000 },
    methodology,
    platform: "tiktok_shop",
    assetHints: [
      "merchant-owned product main image: white adjustable drawer organizer",
      "merchant-owned product video: hand sorting small desk and drawer items",
      shot.materialQuery
    ]
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
    const existing = path.join(outputRoot, `ark-shot-${shot.order + 1}.mp4`);
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
      productTitle: product.title,
      aspectRatio: "VERTICAL_9_16"
    });
    const fileName = `ark-shot-${shot.order + 1}-${Date.now()}.mp4`;
    const filePath = path.join(outputRoot, fileName);
    let downloaded = false;
    if (output.url) {
      await downloadVideo(output.url, filePath);
      downloaded = true;
      await copyFile(filePath, path.join(outputRoot, `ark-shot-${shot.order + 1}.mp4`));
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
    scriptTitle: `${product.title} Ark Seedance Flagship Demo`,
    shots,
    aspectRatio: "VERTICAL_9_16",
    outputDir: path.join(outputRoot, "final"),
    materials: downloadedResults.map((result) => ({
      shotOrder: result.shotOrder,
      url: result.filePath,
      kind: "remote-video",
      source: "ark"
    })),
    audio: {
      voiceEnabled: false,
      bgmEnabled: true,
      bgmMood: "upbeat",
      bgmVolume: 0.08
    }
  });
}

const manifestPath = path.join(outputRoot, `manifest-${Date.now()}.json`);
await writeFile(
  manifestPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      productTitle: product.title,
      product,
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
      methodology,
      promptCompiler: {
        version: "commerce-shot-v2",
        summary:
          "Each Ark/Seedance prompt is compiled from product truth, methodology strategy/factors, generated storyboard shots, asset retrieval hints and compliance constraints."
      },
      mode: reuseExisting ? "reuse-existing" : "ark-generate",
      modelConfigured: Boolean(process.env.ARK_VIDEO_MODEL),
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

console.log(JSON.stringify({ manifestPath, finalExport, results }, null, 2));

if (results.some((result) => !result.downloaded) || !finalExport) {
  process.exitCode = 1;
}
