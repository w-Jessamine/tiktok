import { mkdir, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { ArkAiProvider } from "../packages/ai/dist/ai/src/index.js";

const outputRoot = path.resolve(process.cwd(), "storage", "demo-ark-seedance");
const args = new Set(process.argv.slice(2));
const shotCount = args.has("--two-shots") ? 2 : 1;

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

requireEnv("ARK_API_KEY");
requireEnv("ARK_VIDEO_MODEL");

await mkdir(outputRoot, { recursive: true });

const provider = new ArkAiProvider(process.env);
const productTitle = "SnapSort Drawer Organizer";
const shots = [
  {
    order: 0,
    durationMs: 3000,
    visualPrompt:
      "TikTok Shop product video, real home drawer organizer in frame, messy drawer before, hand places adjustable compartments, satisfying before-after reveal, product stays visible, no text burned into footage",
    cameraMotion: "fast push-in, jump cut, handheld UGC movement",
    materialQuery: "drawer organizer before after hand demo",
    subtitle: "Messy drawer? Fix it in seconds",
    voiceover: "Messy drawer? This organizer makes the reset quick and visible.",
    bgmMood: "fast satisfying beat"
  },
  {
    order: 1,
    durationMs: 3000,
    visualPrompt:
      "Close-up ecommerce proof shot of adjustable drawer organizer compartments, hand moves socks and small items into sections, clean bright room, realistic product scale, conversion-focused CTA ending",
    cameraMotion: "macro close-up, gentle pull-back, quick CTA hold",
    materialQuery: "adjustable compartments close up product proof",
    subtitle: "Adjustable sections, cleaner mornings",
    voiceover: "Adjustable sections make small drawers easier to use every morning.",
    bgmMood: "bright CTA finish"
  }
].slice(0, shotCount);

const results = [];
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
  }
  results.push({
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

const manifestPath = path.join(outputRoot, `manifest-${Date.now()}.json`);
await writeFile(
  manifestPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      productTitle,
      modelConfigured: Boolean(process.env.ARK_VIDEO_MODEL),
      results
    },
    null,
    2
  )
);

console.log(JSON.stringify({ manifestPath, results }, null, 2));

if (results.some((result) => !result.downloaded)) {
  process.exitCode = 1;
}
