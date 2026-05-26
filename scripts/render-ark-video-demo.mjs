import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { ArkAiProvider } from "../packages/ai/dist/ai/src/index.js";
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

const safePromptPrefix =
  "Vertical TikTok Shop ecommerce video. UGC handheld realism. Product must stay visible. No burned-in text, no logos, no fake review, no fake discount, no medical claim.";

const assertExistingClip = async (filePath) => {
  const fileStat = await stat(filePath).catch(() => undefined);
  if (!fileStat?.isFile() || fileStat.size <= 0) {
    throw new Error(
      `Missing reusable Ark clip: ${filePath}. Run pnpm demo:ark-video once without --reuse-existing first.`
    );
  }
};

await mkdir(outputRoot, { recursive: true });

const productTitle = "SnapSort Drawer Organizer";
const shots = [
  {
    order: 0,
    durationMs: 5000,
    visualPrompt: `${safePromptPrefix} Hook shot: open a messy drawer, reveal a white adjustable drawer organizer, hand quickly places the organizer into the drawer, before-after transformation starts, realistic home lighting.`,
    cameraMotion: "fast push-in, jump cut, handheld first-person movement",
    materialQuery: "drawer organizer before after hand demo",
    subtitle: "Messy drawer? Fix it in seconds",
    voiceover: "Messy drawer? This organizer makes the reset quick and visible.",
    bgmMood: "fast satisfying beat"
  },
  {
    order: 1,
    durationMs: 5000,
    visualPrompt: `${safePromptPrefix} Proof shot: close-up of adjustable compartments, hand sorts clips, pens, keys and small items into sections, show scale and material texture, practical satisfying organization.`,
    cameraMotion: "macro close-up, gentle pull-back, quick proof cuts",
    materialQuery: "adjustable compartments close up product proof",
    subtitle: "Adjustable sections, cleaner mornings",
    voiceover: "Adjustable sections make small drawers easier to use every morning.",
    bgmMood: "bright CTA finish"
  },
  {
    order: 2,
    durationMs: 5000,
    visualPrompt: `${safePromptPrefix} CTA shot: clean drawer fully organized with the product centered, hand closes and reopens drawer smoothly, product packshot feeling, shopper-friendly final moment.`,
    cameraMotion: "smooth pull-back to organized drawer, final product hold",
    materialQuery: "organized drawer final CTA product hold",
    subtitle: "Tap to upgrade your drawer",
    voiceover: "Tap to upgrade your drawer while the organizer is available.",
    bgmMood: "bright CTA finish"
  }
].slice(0, shotCount);

const results = [];
if (reuseExisting) {
  for (const shot of shots) {
    const existing = path.join(outputRoot, `ark-shot-${shot.order + 1}.mp4`);
    await assertExistingClip(existing);
    results.push({
      prompt: shot.visualPrompt,
      shotOrder: shot.order,
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
      productTitle,
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
    scriptTitle: `${productTitle} Ark Seedance Flagship Demo`,
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
      productTitle,
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
