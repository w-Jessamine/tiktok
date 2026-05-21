import { mkdir } from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import type { StoryboardShot, VideoAspectRatio } from "@videopilot/shared";

export type RenderInput = {
  scriptTitle: string;
  shots: StoryboardShot[];
  aspectRatio: VideoAspectRatio;
  outputDir: string;
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

export const renderStoryboardVideo = async (input: RenderInput): Promise<RenderOutput> => {
  await mkdir(input.outputDir, { recursive: true });
  const resolution = getResolution(input.aspectRatio);
  const outputPath = path.join(input.outputDir, `${Date.now()}-${input.aspectRatio}.mp4`);
  const coverPath = outputPath.replace(/\.mp4$/, ".jpg");
  const durationMs = getDurationMs(input.shots);
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

  await execa("ffmpeg", ["-y", "-i", outputPath, "-frames:v", "1", coverPath]);

  return {
    filePath: outputPath,
    coverPath,
    durationMs,
    resolution
  };
};
