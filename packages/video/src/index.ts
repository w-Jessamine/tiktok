import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import type { StoryboardShot, VideoAspectRatio } from "@videopilot/shared";

export type RenderInput = {
  scriptTitle: string;
  shots: StoryboardShot[];
  aspectRatio: VideoAspectRatio;
  outputDir: string;
  materials?: RenderMaterial[];
};

export type RenderMaterial = {
  shotOrder: number;
  url: string;
  kind: "image" | "video" | "remote-video";
  startMs?: number;
  endMs?: number;
};

export type RenderOutput = {
  filePath: string;
  coverPath: string;
  durationMs: number;
  resolution: string;
};

export const getResolution = (aspectRatio: VideoAspectRatio) =>
  aspectRatio === "HORIZONTAL_16_9" ? "1280x720" : "720x1280";

export const getDurationMs = (shots: StoryboardShot[]) =>
  Math.min(
    15000,
    shots.reduce((sum, shot) => sum + shot.durationMs, 0)
  );

const escapeDrawText = (text: string) =>
  text.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");

export const buildMockRenderFilter = (shots: StoryboardShot[], aspectRatio: VideoAspectRatio) => {
  const [width, height] = getResolution(aspectRatio).split("x").map(Number) as [number, number];
  const duration = getDurationMs(shots) / 1000;
  const subtitle = escapeDrawText(shots.map((shot) => shot.subtitle).join("  |  ").slice(0, 160));
  const title = escapeDrawText(shots[0]?.visualPrompt.slice(0, 90) ?? "AIGC product video");
  return [
    `color=c=#111827:s=${width}x${height}:d=${duration}`,
    `drawbox=x=0:y=0:w=${width}:h=${height}:color=#0f766e@0.22:t=fill`,
    `drawtext=text='${title}':fontcolor=white:fontsize=${aspectRatio === "HORIZONTAL_16_9" ? 42 : 36}:x=(w-text_w)/2:y=h*0.18`,
    `drawtext=text='${subtitle}':fontcolor=white:fontsize=${aspectRatio === "HORIZONTAL_16_9" ? 30 : 28}:x=(w-text_w)/2:y=h*0.76`,
    "format=yuv420p"
  ].join(",");
};

const escapePathForConcat = (filePath: string) => filePath.replace(/\\/g, "/").replace(/'/g, "'\\''");

const isRemoteUrl = (url: string) => /^https?:\/\//i.test(url);

const normalizeLocalUrl = (url: string) => {
  if (isRemoteUrl(url)) {
    return url;
  }
  if (url.startsWith("/storage/")) {
    return path.resolve(process.cwd(), url.slice(1));
  }
  return path.resolve(process.cwd(), url);
};

const renderMaterialClip = async (input: {
  material: RenderMaterial;
  shot: StoryboardShot;
  aspectRatio: VideoAspectRatio;
  outputDir: string;
  index: number;
}) => {
  const resolution = getResolution(input.aspectRatio);
  const [width, height] = resolution.split("x").map(Number) as [number, number];
  const durationSeconds = Math.max(1.2, Math.min(5, input.shot.durationMs / 1000));
  const outputPath = path.join(input.outputDir, `clip-${input.index}.mp4`);
  const sourceUrl = normalizeLocalUrl(input.material.url);
  const subtitle = escapeDrawText(input.shot.subtitle.slice(0, 80));
  const commonVideoFilter = [
    `scale=${width}:${height}:force_original_aspect_ratio=increase`,
    `crop=${width}:${height}`,
    `drawbox=x=0:y=h*0.72:w=w:h=h*0.28:color=black@0.35:t=fill`,
    `drawtext=text='${subtitle}':fontcolor=white:fontsize=${input.aspectRatio === "HORIZONTAL_16_9" ? 30 : 28}:x=(w-text_w)/2:y=h*0.80`,
    "format=yuv420p"
  ].join(",");

  if (input.material.kind === "image") {
    await execa("ffmpeg", [
      "-y",
      "-loop",
      "1",
      "-t",
      String(durationSeconds),
      "-i",
      sourceUrl,
      "-vf",
      commonVideoFilter,
      "-movflags",
      "+faststart",
      outputPath
    ]);
    return outputPath;
  }

  const trimStart = Math.max(0, (input.material.startMs ?? 0) / 1000);
  await execa("ffmpeg", [
    "-y",
    "-ss",
    String(trimStart),
    "-t",
    String(durationSeconds),
    "-i",
    sourceUrl,
    "-vf",
    commonVideoFilter,
    "-an",
    "-movflags",
    "+faststart",
    outputPath
  ]);
  return outputPath;
};

const concatClips = async (clipPaths: string[], outputPath: string) => {
  const listPath = outputPath.replace(/\.mp4$/, "-concat.txt");
  await writeFile(
    listPath,
    clipPaths.map((clipPath) => `file '${escapePathForConcat(path.resolve(clipPath))}'`).join("\n")
  );
  await execa("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    outputPath
  ]);
};

export const renderStoryboardVideo = async (input: RenderInput): Promise<RenderOutput> => {
  await mkdir(input.outputDir, { recursive: true });
  const resolution = getResolution(input.aspectRatio);
  const outputPath = path.join(input.outputDir, `${Date.now()}-${input.aspectRatio}.mp4`);
  const coverPath = outputPath.replace(/\.mp4$/, ".jpg");
  const durationMs = getDurationMs(input.shots);
  const materialByOrder = new Map((input.materials ?? []).map((material) => [material.shotOrder, material]));

  const clipPaths: string[] = [];
  for (const shot of input.shots) {
    const material = materialByOrder.get(shot.order);
    if (!material) {
      continue;
    }
    try {
      clipPaths.push(
        await renderMaterialClip({
          material,
          shot,
          aspectRatio: input.aspectRatio,
          outputDir: input.outputDir,
          index: clipPaths.length
        })
      );
    } catch {
      // A single bad merchant asset should not break the full export; fallback below keeps the demo complete.
    }
  }

  if (clipPaths.length > 0) {
    await concatClips(clipPaths, outputPath);
  } else {
    const filter = buildMockRenderFilter(input.shots, input.aspectRatio);
    await execa("ffmpeg", [
      "-y",
      "-f",
      "lavfi",
      "-i",
      filter,
      "-t",
      String(durationMs / 1000),
      "-movflags",
      "+faststart",
      outputPath
    ]);
  }

  await execa("ffmpeg", ["-y", "-i", outputPath, "-frames:v", "1", coverPath]);

  return {
    filePath: outputPath,
    coverPath,
    durationMs,
    resolution
  };
};
