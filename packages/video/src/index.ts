import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import type { StoryboardShot, VideoAspectRatio } from "@videopilot/shared";

export type RenderInput = {
  scriptTitle: string;
  shots: StoryboardShot[];
  aspectRatio: VideoAspectRatio;
  outputDir: string;
  materials?: RenderMaterial[];
  audio?: RenderAudioInput;
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

export type RenderAudioInput = {
  voiceEnabled?: boolean;
  bgmEnabled?: boolean;
  voiceLocale?: string;
  bgmMood?: string;
  voiceVolume?: number;
  bgmVolume?: number;
  voicePaths?: string[];
  bgmPath?: string;
};

export type ThumbnailOutput = {
  filePath: string;
  capturedAtMs: number;
};

export const getResolution = (aspectRatio: VideoAspectRatio) =>
  aspectRatio === "HORIZONTAL_16_9" ? "1280x720" : "720x1280";

export const getDurationMs = (shots: StoryboardShot[]) =>
  Math.min(
    15000,
    shots.reduce((sum, shot) => sum + shot.durationMs, 0)
  );

const escapeDrawText = (text: string) =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/%/g, "\\%");

const wrapText = (text: string, maxChars: number, maxLines: number) => {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) {
      lines.push(current);
    }
    current = word.length > maxChars ? `${word.slice(0, Math.max(1, maxChars - 1))}.` : word;
    if (lines.length >= maxLines) {
      break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (lines.length === 0) {
    lines.push("AIGC product story");
  }
  return lines;
};

const shotPalettes = [
  { bg: "#052e2b", accent: "#14b8a6", panel: "#0f172a", halo: "#f97316" },
  { bg: "#1f2937", accent: "#f97316", panel: "#111827", halo: "#22c55e" },
  { bg: "#172554", accent: "#38bdf8", panel: "#0f172a", halo: "#facc15" },
  { bg: "#312e81", accent: "#a78bfa", panel: "#111827", halo: "#fb7185" },
  { bg: "#3f1d2b", accent: "#fb7185", panel: "#111827", halo: "#2dd4bf" },
  { bg: "#1f1f1f", accent: "#facc15", panel: "#0f172a", halo: "#38bdf8" }
];

const shotStages = ["HOOK", "PRODUCT", "PROOF", "OFFER", "TRUST", "CTA"];

const drawTextLines = (input: {
  lines: string[];
  fontSize: number;
  y: string;
  lineHeight: number;
  color?: string;
  x?: string;
  box?: boolean;
}) =>
  input.lines
    .map((line, index) => {
      const y = `${input.y}${index === 0 ? "" : `+${index * input.lineHeight}`}`;
      const box = input.box ? ":box=1:boxcolor=black@0.28:boxborderw=18" : "";
      return `drawtext=text='${escapeDrawText(line)}':fontcolor=${input.color ?? "white"}:fontsize=${input.fontSize}:x=${input.x ?? "(w-text_w)/2"}:y=${y}${box}`;
    })
    .join(",");

export const buildMockRenderFilter = (shots: StoryboardShot[], aspectRatio: VideoAspectRatio) => {
  const [width, height] = getResolution(aspectRatio).split("x").map(Number) as [number, number];
  const duration = getDurationMs(shots) / 1000;
  const titleLines = wrapText(shots[0]?.visualPrompt ?? "AIGC product video", 28, 3);
  const subtitleLines = wrapText(
    shots
      .map((shot) => shot.subtitle)
      .join(" / ")
      .slice(0, 220),
    aspectRatio === "HORIZONTAL_16_9" ? 62 : 34,
    3
  );
  const fontSize = aspectRatio === "HORIZONTAL_16_9" ? 38 : 34;
  const subtitleSize = aspectRatio === "HORIZONTAL_16_9" ? 28 : 26;
  return [
    `color=c=#111827:s=${width}x${height}:d=${duration}`,
    `drawbox=x=0:y=0:w=${width}:h=${height}:color=#0f766e@0.22:t=fill`,
    `drawbox=x=w*0.08:y=h*0.14:w=w*0.84:h=h*0.34:color=black@0.22:t=fill`,
    drawTextLines({
      lines: titleLines,
      fontSize,
      y: "h*0.20",
      lineHeight: fontSize + 10,
      box: true
    }),
    drawTextLines({
      lines: subtitleLines,
      fontSize: subtitleSize,
      y: "h*0.72",
      lineHeight: subtitleSize + 9,
      box: true
    }),
    "format=yuv420p"
  ].join(",");
};

const escapePathForConcat = (filePath: string) =>
  filePath.replace(/\\/g, "/").replace(/'/g, "'\\''");

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

const hasUsableAudioFile = async (filePath?: string) => {
  if (!filePath) {
    return false;
  }
  try {
    const fileStat = await stat(filePath);
    return fileStat.size > 44;
  } catch {
    return false;
  }
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

const renderFallbackShotClip = async (input: {
  shot: StoryboardShot;
  aspectRatio: VideoAspectRatio;
  outputDir: string;
  index: number;
}) => {
  const resolution = getResolution(input.aspectRatio);
  const [width, height] = resolution.split("x").map(Number) as [number, number];
  const durationSeconds = Math.max(1.2, Math.min(5, input.shot.durationMs / 1000));
  const palette = shotPalettes[input.index % shotPalettes.length] ?? shotPalettes[0]!;
  const stage = shotStages[input.index] ?? "SHOT";
  const outputPath = path.join(input.outputDir, `fallback-${input.index}.mp4`);
  const card = {
    x: Math.round(width * 0.08),
    y: Math.round(height * 0.11),
    width: Math.round(width * 0.84),
    height: Math.round(height * 0.46)
  };
  const accentWidth = Math.max(8, Math.round(width * 0.018));
  const productGlow = {
    x: Math.round(width * 0.22),
    y: Math.round(height * 0.6),
    width: Math.round(width * 0.56),
    height: Math.round(height * 0.1)
  };
  const productShine = {
    x: Math.round(width * 0.28),
    y: Math.round(height * 0.64),
    width: Math.round(width * 0.44),
    height: Math.round(height * 0.055)
  };
  const subtitlePanel = {
    x: Math.round(width * 0.08),
    y: Math.round(height * 0.73),
    width: Math.round(width * 0.84),
    height: Math.round(height * 0.17)
  };
  const titleLines = wrapText(
    input.shot.visualPrompt,
    input.aspectRatio === "HORIZONTAL_16_9" ? 46 : 26,
    3
  );
  const subtitleLines = wrapText(
    input.shot.subtitle,
    input.aspectRatio === "HORIZONTAL_16_9" ? 58 : 30,
    2
  );
  const motionLines = wrapText(input.shot.cameraMotion, 22, 1);
  const titleSize = input.aspectRatio === "HORIZONTAL_16_9" ? 32 : 31;
  const subtitleSize = input.aspectRatio === "HORIZONTAL_16_9" ? 28 : 27;
  const stageSize = input.aspectRatio === "HORIZONTAL_16_9" ? 24 : 23;

  const filter = [
    `color=c=${palette.bg}:s=${width}x${height}:d=${durationSeconds}`,
    `drawbox=x=0:y=0:w=${width}:h=${height}:color=${palette.bg}:t=fill`,
    `drawbox=x=${card.x}:y=${card.y}:w=${card.width}:h=${card.height}:color=${palette.panel}@0.72:t=fill`,
    `drawbox=x=${card.x}:y=${card.y}:w=${accentWidth}:h=${card.height}:color=${palette.accent}:t=fill`,
    `drawbox=x=${productGlow.x}:y=${productGlow.y}:w=${productGlow.width}:h=${productGlow.height}:color=${palette.halo}@0.42:t=fill`,
    `drawbox=x=${productShine.x}:y=${productShine.y}:w=${productShine.width}:h=${productShine.height}:color=white@0.18:t=fill`,
    `drawtext=text='${escapeDrawText(stage)}':fontcolor=${palette.accent}:fontsize=${stageSize}:x=w*0.13:y=h*0.145`,
    `drawtext=text='${escapeDrawText(`0${input.index + 1}`)}':fontcolor=white@0.75:fontsize=${stageSize}:x=w*0.80:y=h*0.145`,
    drawTextLines({
      lines: titleLines,
      fontSize: titleSize,
      y: "h*0.23",
      lineHeight: titleSize + 11,
      x: "w*0.14",
      box: false
    }),
    `drawtext=text='${escapeDrawText(motionLines[0] ?? "steady reveal")}':fontcolor=white@0.78:fontsize=${stageSize}:x=w*0.14:y=h*0.49`,
    `drawbox=x=${subtitlePanel.x}:y=${subtitlePanel.y}:w=${subtitlePanel.width}:h=${subtitlePanel.height}:color=black@0.34:t=fill`,
    drawTextLines({
      lines: subtitleLines,
      fontSize: subtitleSize,
      y: "h*0.765",
      lineHeight: subtitleSize + 10,
      box: false
    }),
    "format=yuv420p"
  ].join(",");

  await execa("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    filter,
    "-t",
    String(durationSeconds),
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

const buildAudioInputs = async (input: {
  audio?: RenderAudioInput;
  durationMs: number;
  outputDir: string;
}) => {
  if (!input.audio?.voiceEnabled && !input.audio?.bgmEnabled) {
    return { args: [] as string[], filter: undefined as string | undefined };
  }
  const args: string[] = [];
  const streams: string[] = [];
  let nextIndex = 1;
  const durationSeconds = Math.max(1, input.durationMs / 1000);

  if (input.audio?.voiceEnabled) {
    const existingVoicePaths = (input.audio.voicePaths ?? []).filter(Boolean);
    if (existingVoicePaths.length && (await hasUsableAudioFile(existingVoicePaths[0]))) {
      args.push("-i", existingVoicePaths[0]!);
      streams.push(`[${nextIndex}:a]volume=${input.audio.voiceVolume ?? 0.9}[voice]`);
      nextIndex += 1;
    } else {
      args.push(
        "-f",
        "lavfi",
        "-t",
        String(durationSeconds),
        "-i",
        "sine=frequency=440:sample_rate=44100"
      );
      streams.push(`[${nextIndex}:a]volume=${input.audio.voiceVolume ?? 0.25}[voice]`);
      nextIndex += 1;
    }
  }

  if (input.audio?.bgmEnabled) {
    if (await hasUsableAudioFile(input.audio.bgmPath)) {
      args.push("-stream_loop", "-1", "-i", input.audio.bgmPath!);
      streams.push(`[${nextIndex}:a]volume=${input.audio.bgmVolume ?? 0.18}[bgm]`);
      nextIndex += 1;
    } else {
      args.push(
        "-f",
        "lavfi",
        "-t",
        String(durationSeconds),
        "-i",
        "sine=frequency=176:sample_rate=44100"
      );
      streams.push(`[${nextIndex}:a]volume=${input.audio.bgmVolume ?? 0.12}[bgm]`);
      nextIndex += 1;
    }
  }

  if (!streams.length) {
    return { args: [], filter: undefined };
  }
  const labels = streams
    .map((stream) => {
      const match = stream.match(/\[([^\]]+)\]$/);
      return match ? `[${match[1]}]` : "";
    })
    .join("");
  return {
    args,
    filter: `${streams.join(";")};${labels}amix=inputs=${streams.length}:duration=first:dropout_transition=0[aout]`
  };
};

export const renderStoryboardVideo = async (input: RenderInput): Promise<RenderOutput> => {
  await mkdir(input.outputDir, { recursive: true });
  const resolution = getResolution(input.aspectRatio);
  const outputPath = path.join(input.outputDir, `${Date.now()}-${input.aspectRatio}.mp4`);
  const coverPath = outputPath.replace(/\.mp4$/, ".jpg");
  const durationMs = getDurationMs(input.shots);
  const materialByOrder = new Map(
    (input.materials ?? []).map((material) => [material.shotOrder, material])
  );

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

  if (clipPaths.length === 0) {
    for (const shot of input.shots) {
      clipPaths.push(
        await renderFallbackShotClip({
          shot,
          aspectRatio: input.aspectRatio,
          outputDir: input.outputDir,
          index: clipPaths.length
        })
      );
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

  const audio = await buildAudioInputs({
    audio: input.audio,
    durationMs,
    outputDir: input.outputDir
  });
  if (audio.filter) {
    const audioOutputPath = outputPath.replace(/\.mp4$/, "-audio.mp4");
    await execa("ffmpeg", [
      "-y",
      "-i",
      outputPath,
      ...audio.args,
      "-filter_complex",
      audio.filter,
      "-map",
      "0:v",
      "-map",
      "[aout]",
      "-t",
      String(durationMs / 1000),
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-shortest",
      "-movflags",
      "+faststart",
      audioOutputPath
    ]);
    await rename(audioOutputPath, outputPath);
  }

  await execa("ffmpeg", ["-y", "-i", outputPath, "-frames:v", "1", coverPath]);

  return {
    filePath: outputPath,
    coverPath,
    durationMs,
    resolution
  };
};

export const generateVideoThumbnail = async (input: {
  sourceUrl: string;
  outputDir: string;
  startMs?: number;
  endMs?: number;
  filenamePrefix?: string;
}): Promise<ThumbnailOutput> => {
  await mkdir(input.outputDir, { recursive: true });
  const startMs = Math.max(0, input.startMs ?? 0);
  const endMs = Math.max(startMs + 1, input.endMs ?? startMs + 1);
  const capturedAtMs = Math.round(startMs + (endMs - startMs) / 2);
  const outputPath = path.join(
    input.outputDir,
    `${input.filenamePrefix ?? "thumb"}-${capturedAtMs}.jpg`
  );
  await execa("ffmpeg", [
    "-y",
    "-ss",
    String(capturedAtMs / 1000),
    "-i",
    normalizeLocalUrl(input.sourceUrl),
    "-frames:v",
    "1",
    "-vf",
    "scale=320:-2",
    outputPath
  ]);
  return { filePath: outputPath, capturedAtMs };
};
