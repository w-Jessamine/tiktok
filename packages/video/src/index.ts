import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import type { StoryboardShot, VideoAspectRatio, VideoRenderSource } from "@videopilot/shared";

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
  source?: "ark" | "merchant" | "fallback";
  startMs?: number;
  endMs?: number;
};

export type RenderOutput = {
  filePath: string;
  coverPath: string;
  durationMs: number;
  resolution: string;
  renderSource: VideoRenderSource;
  clipStats: {
    arkClips: number;
    materialClips: number;
    fallbackClips: number;
    failedMaterialClips: number;
    totalClips: number;
  };
};

export type RenderAudioInput = {
  voiceEnabled?: boolean;
  bgmEnabled?: boolean;
  preserveSourceAudio?: boolean;
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

export type RenderClipStats = RenderOutput["clipStats"];

const FPS = 30;

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

const motionPresets = [
  {
    zoom: "1.04+0.0018*on",
    x: "iw/2-(iw/zoom/2)+sin(on/18)*12",
    y: "ih/2-(ih/zoom/2)+cos(on/22)*10"
  },
  {
    zoom: "1.12-0.0012*on",
    x: "iw/2-(iw/zoom/2)-sin(on/20)*14",
    y: "ih/2-(ih/zoom/2)+sin(on/25)*8"
  },
  {
    zoom: "1.06+0.0010*on",
    x: "iw/2-(iw/zoom/2)+cos(on/16)*18",
    y: "ih/2-(ih/zoom/2)"
  },
  {
    zoom: "1.09+0.0014*on",
    x: "iw/2-(iw/zoom/2)",
    y: "ih/2-(ih/zoom/2)+sin(on/14)*12"
  }
];

const getMotionPreset = (index: number) => motionPresets[index % motionPresets.length]!;

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

const withFps = (durationSeconds: number) => Math.max(1, Math.round(durationSeconds * FPS));

const buildKenBurnsScale = (input: {
  width: number;
  height: number;
  durationSeconds: number;
  index: number;
}) => {
  const preset = getMotionPreset(input.index);
  const frames = withFps(input.durationSeconds);
  return [
    `scale=${input.width * 2}:${input.height * 2}:force_original_aspect_ratio=increase`,
    `crop=${input.width * 2}:${input.height * 2}`,
    `zoompan=z='min(${preset.zoom}\\,1.22)':x='${preset.x}':y='${preset.y}':d=${frames}:s=${input.width}x${input.height}:fps=${FPS}`,
    `trim=duration=${input.durationSeconds}`,
    "setpts=PTS-STARTPTS"
  ].join(",");
};

const between = (start: number, end: number) => `between(t\\,${start}\\,${end})`;

const buildVideoMotionScale = (input: { width: number; height: number; index: number }) => {
  void input.index;
  return [
    `scale=${input.width}:${input.height}:force_original_aspect_ratio=increase`,
    `crop=${input.width}:${input.height}`,
    "setpts=PTS-STARTPTS"
  ].join(",");
};

const buildSubtitleOverlay = (input: {
  shot: StoryboardShot;
  aspectRatio: VideoAspectRatio;
  index: number;
}) => {
  const subtitleLines = wrapText(
    input.shot.subtitle.slice(0, 88),
    input.aspectRatio === "HORIZONTAL_16_9" ? 54 : 30,
    2
  );
  const queryBadge = escapeDrawText(input.shot.materialQuery.split(/\s+/).slice(0, 4).join(" "));
  const fontSize = input.aspectRatio === "HORIZONTAL_16_9" ? 30 : 28;
  const badgeSize = input.aspectRatio === "HORIZONTAL_16_9" ? 20 : 19;
  return [
    "drawbox=x=0:y=ih*0.70:w=iw:h=ih*0.30:color=black@0.26:t=fill",
    `drawbox=x=iw*0.07:y=ih*0.075:w=iw*0.28:h=ih*0.044:color=black@0.30:t=fill:enable='${between(0, 1.7)}'`,
    `drawtext=text='SHOT ${input.index + 1}':fontcolor=white@0.86:fontsize=${badgeSize}:x=w*0.09:y=h*0.085:enable='${between(0, 1.7)}'`,
    `drawtext=text='${queryBadge}':fontcolor=white@0.72:fontsize=${badgeSize}:x=w*0.09:y=h*0.13:enable='${between(0.15, 1.9)}'`,
    drawTextLines({
      lines: subtitleLines,
      fontSize,
      y: "h*0.765",
      lineHeight: fontSize + 10,
      box: true
    })
  ].join(",");
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
  preserveSourceAudio?: boolean;
}) => {
  const resolution = getResolution(input.aspectRatio);
  const [width, height] = resolution.split("x").map(Number) as [number, number];
  const durationSeconds = Math.max(1.2, Math.min(5, input.shot.durationMs / 1000));
  const outputPath = path.join(input.outputDir, `clip-${input.index}.mp4`);
  const sourceUrl = normalizeLocalUrl(input.material.url);
  const imageMotion = buildKenBurnsScale({
    width,
    height,
    durationSeconds,
    index: input.index
  });
  const sourceVideoMotion = buildVideoMotionScale({ width, height, index: input.index });
  const overlay = buildSubtitleOverlay({
    shot: input.shot,
    aspectRatio: input.aspectRatio,
    index: input.index
  });
  const imageVideoFilter = [
    imageMotion,
    "eq=contrast=1.05:saturation=1.10",
    overlay,
    "format=yuv420p"
  ].join(",");
  const sourceVideoFilter = [
    sourceVideoMotion,
    "eq=contrast=1.05:saturation=1.10",
    overlay,
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
      imageVideoFilter,
      "-movflags",
      "+faststart",
      outputPath
    ]);
    return outputPath;
  }

  const trimStart = Math.max(0, (input.material.startMs ?? 0) / 1000);
  const preserveAudio = Boolean(
    input.preserveSourceAudio &&
    input.material.source === "ark" &&
    input.material.kind === "remote-video"
  );
  const args = [
    "-y",
    "-ss",
    String(trimStart),
    "-t",
    String(durationSeconds),
    "-i",
    sourceUrl,
    "-vf",
    sourceVideoFilter,
    ...(preserveAudio
      ? ["-map", "0:v:0", "-map", "0:a?", "-c:v", "libx264", "-c:a", "aac", "-shortest"]
      : ["-an"]),
    "-movflags",
    "+faststart",
    outputPath
  ];
  await execa("ffmpeg", args);
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

const renderDynamicFallbackShotClip = async (input: {
  shot: StoryboardShot;
  aspectRatio: VideoAspectRatio;
  outputDir: string;
  index: number;
}) => {
  const resolution = getResolution(input.aspectRatio);
  const [width, height] = resolution.split("x").map(Number) as [number, number];
  const durationSeconds = Math.max(1.2, Math.min(5, input.shot.durationMs / 1000));
  const outputPath = path.join(input.outputDir, `dynamic-fallback-${input.index}.mp4`);
  const palette = shotPalettes[input.index % shotPalettes.length] ?? shotPalettes[0]!;
  const stage = shotStages[input.index] ?? "SHOT";
  const subtitleLines = wrapText(
    input.shot.subtitle,
    input.aspectRatio === "HORIZONTAL_16_9" ? 54 : 28,
    2
  );
  const detailLines = wrapText(
    input.shot.materialQuery,
    input.aspectRatio === "HORIZONTAL_16_9" ? 34 : 20,
    2
  );
  const stageSize = input.aspectRatio === "HORIZONTAL_16_9" ? 24 : 22;
  const detailSize = input.aspectRatio === "HORIZONTAL_16_9" ? 24 : 22;
  const subtitleSize = input.aspectRatio === "HORIZONTAL_16_9" ? 28 : 27;
  const movingBox = (base: number, amplitude: number, speed: number, phase = 0) =>
    `${base}+${amplitude}*sin(t*${speed}+${phase})`;
  const productX = Math.round(width * (input.index % 2 === 0 ? 0.31 : 0.43));
  const productY = Math.round(height * 0.24);
  const productW = Math.round(width * 0.28);
  const productH = Math.round(height * 0.34);
  const proofPanelX = Math.round(width * 0.1);
  const proofPanelY = Math.round(height * 0.58);
  const proofPanelW = Math.round(width * 0.8);
  const proofPanelH = Math.round(height * 0.12);
  const sweepWidth = Math.round(width * 0.2);
  const sweepTravel = width + Math.round(width * 0.38);
  const subtitlePanelY = Math.round(height * 0.78);
  const subtitlePanelH = height - subtitlePanelY;
  const bottleNeckW = Math.round(productW * 0.34);
  const bottleNeckH = Math.round(productH * 0.18);
  const bottleBodyW = Math.round(productW * 0.7);
  const bottleBodyH = Math.round(productH * 0.72);
  const capH = Math.round(productH * 0.08);
  const beforeAfterEnabled = input.index === 0 || input.index === 2;
  const ctaEnabled = input.index >= 3;
  const filter = [
    `color=c=${palette.bg}:s=${width}x${height}:r=${FPS}:d=${durationSeconds}`,
    `drawbox=x=0:y=0:w=${width}:h=${height}:color=${palette.bg}:t=fill`,
    `drawbox=x='${movingBox(Math.round(width * 0.07), 18, 2.1)}':y='${movingBox(Math.round(height * 0.1), 10, 1.5, 1.57)}':w=${Math.round(width * 0.86)}:h=${Math.round(height * 0.64)}:color=${palette.panel}@0.30:t=fill`,
    `drawbox=x=${Math.round(width * 0.06)}:y=${Math.round(height * 0.06)}:w=${Math.round(width * 0.36)}:h=${Math.round(height * 0.05)}:color=black@0.28:t=fill`,
    `drawtext=text='${escapeDrawText(stage)}':fontcolor=${palette.accent}:fontsize=${stageSize}:x=w*0.09:y=h*0.072:enable='${between(0, 1.6)}'`,
    `drawbox=x='${movingBox(productX, 24, 2.8)}':y='${movingBox(productY, 14, 1.8, 1.57)}':w=${productW}:h=${productH}:color=white@0.12:t=fill`,
    `drawbox=x='${movingBox(productX + Math.round(productW * 0.33), 17, 3.1)}':y='${movingBox(productY - capH, 10, 2.2, 1.57)}':w=${bottleNeckW}:h=${bottleNeckH}:color=white@0.78:t=fill`,
    `drawbox=x='${movingBox(productX + Math.round(productW * 0.15), 18, 3.1)}':y='${movingBox(productY + Math.round(productH * 0.13), 12, 2.2, 1.57)}':w=${bottleBodyW}:h=${bottleBodyH}:color=${palette.halo}@0.78:t=fill`,
    `drawbox=x='${movingBox(productX + Math.round(productW * 0.22), 16, 3.8)}':y='${movingBox(productY + Math.round(productH * 0.2), 10, 2.4, 1.57)}':w=${Math.round(productW * 0.56)}:h=${Math.round(productH * 0.24)}:color=white@0.24:t=fill`,
    `drawbox=x='${movingBox(productX + Math.round(productW * 0.26), 14, 3.8)}':y='${movingBox(productY + Math.round(productH * 0.47), 9, 2.4, 1.57)}':w=${Math.round(productW * 0.48)}:h=${Math.round(productH * 0.04)}:color=black@0.24:t=fill`,
    `drawbox=x='${movingBox(productX + Math.round(productW * 0.3), 13, 3.8)}':y='${movingBox(productY + Math.round(productH * 0.56), 9, 2.4, 1.57)}':w=${Math.round(productW * 0.4)}:h=${Math.round(productH * 0.035)}:color=black@0.18:t=fill`,
    `drawbox=x='mod(t*${Math.round(width * 0.42)}\\,${sweepTravel})-${Math.round(width * 0.38)}':y=0:w=${sweepWidth}:h=${height}:color=white@0.08:t=fill`,
    `drawbox=x=${proofPanelX}:y='${movingBox(proofPanelY, 8, 1.9)}':w=${proofPanelW}:h=${proofPanelH}:color=black@0.30:t=fill`,
    ...(beforeAfterEnabled
      ? [
          `drawbox=x=${Math.round(width * 0.12)}:y=${Math.round(height * 0.52)}:w=${Math.round(width * 0.31)}:h=${Math.round(height * 0.15)}:color=white@0.16:t=fill`,
          `drawbox=x=${Math.round(width * 0.57)}:y=${Math.round(height * 0.52)}:w=${Math.round(width * 0.31)}:h=${Math.round(height * 0.15)}:color=${palette.accent}@0.28:t=fill`,
          `drawtext=text='BEFORE':fontcolor=white@0.72:fontsize=${Math.max(16, detailSize - 4)}:x=w*0.18:y=h*0.545`,
          `drawtext=text='AFTER':fontcolor=white@0.90:fontsize=${Math.max(16, detailSize - 4)}:x=w*0.64:y=h*0.545`
        ]
      : []),
    ...(ctaEnabled
      ? [
          `drawbox=x=${Math.round(width * 0.16)}:y=${Math.round(height * 0.52)}:w=${Math.round(width * 0.68)}:h=${Math.round(height * 0.11)}:color=${palette.accent}@0.42:t=fill`,
          `drawtext=text='SHOP NOW':fontcolor=white:fontsize=${Math.max(24, detailSize + 6)}:x=(w-text_w)/2:y=h*0.55`
        ]
      : []),
    drawTextLines({
      lines: detailLines,
      fontSize: detailSize,
      y: "h*0.65",
      lineHeight: detailSize + 8,
      x: "w*0.14",
      box: false
    }),
    `drawbox=x=0:y=${subtitlePanelY}:w=${width}:h=${subtitlePanelH}:color=black@0.34:t=fill`,
    drawTextLines({
      lines: subtitleLines,
      fontSize: subtitleSize,
      y: "h*0.835",
      lineHeight: subtitleSize + 10,
      box: true
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

export const getRenderSourceFromClipStats = (
  stats: RenderClipStats,
  shotCount: number,
  usedStoryboardFallback = false
): VideoRenderSource =>
  usedStoryboardFallback
    ? "STORYBOARD_FALLBACK"
    : stats.arkClips > 0 &&
        stats.materialClips === 0 &&
        stats.fallbackClips === 0 &&
        stats.arkClips === shotCount
      ? "ARK_GENERATED"
      : stats.arkClips > 0 || (stats.materialClips > 0 && stats.fallbackClips > 0)
        ? "HYBRID_MIX"
        : stats.materialClips > 0
          ? "MATERIAL_MIX"
          : "DYNAMIC_FALLBACK";

const renderFallbackClip = async (input: {
  shot: StoryboardShot;
  aspectRatio: VideoAspectRatio;
  outputDir: string;
  index: number;
}) =>
  renderDynamicFallbackShotClip(input).catch((error: unknown) => {
    if (process.env.VIDEOPILOT_RENDER_DEBUG === "true") {
      console.warn(
        "Dynamic fallback render failed; using storyboard fallback.",
        error instanceof Error ? error.message : error
      );
    }
    return renderFallbackShotClip(input);
  });

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
  const clipStats = {
    arkClips: 0,
    materialClips: 0,
    fallbackClips: 0,
    failedMaterialClips: 0,
    totalClips: 0
  };
  let usedStoryboardFallback = false;
  for (const shot of input.shots) {
    const material = materialByOrder.get(shot.order);
    if (!material) {
      clipPaths.push(
        await renderFallbackClip({
          shot,
          aspectRatio: input.aspectRatio,
          outputDir: input.outputDir,
          index: clipPaths.length
        }).catch((error: unknown) => {
          usedStoryboardFallback = true;
          if (process.env.VIDEOPILOT_RENDER_DEBUG === "true") {
            console.warn(
              "Per-shot fallback render failed; using storyboard fallback.",
              error instanceof Error ? error.message : error
            );
          }
          return renderFallbackShotClip({
            shot,
            aspectRatio: input.aspectRatio,
            outputDir: input.outputDir,
            index: clipPaths.length
          });
        })
      );
      clipStats.fallbackClips += 1;
      continue;
    }
    try {
      clipPaths.push(
        await renderMaterialClip({
          material,
          shot,
          aspectRatio: input.aspectRatio,
          outputDir: input.outputDir,
          index: clipPaths.length,
          preserveSourceAudio: input.audio?.preserveSourceAudio
        })
      );
      if (material.source === "ark") {
        clipStats.arkClips += 1;
      } else {
        clipStats.materialClips += 1;
      }
    } catch (error) {
      if (process.env.VIDEOPILOT_RENDER_DEBUG === "true") {
        console.warn(
          "Material clip render failed; using fallback shot.",
          error instanceof Error ? error.message : error
        );
      }
      clipStats.failedMaterialClips += 1;
      clipPaths.push(
        await renderFallbackClip({
          shot,
          aspectRatio: input.aspectRatio,
          outputDir: input.outputDir,
          index: clipPaths.length
        }).catch((error: unknown) => {
          usedStoryboardFallback = true;
          if (process.env.VIDEOPILOT_RENDER_DEBUG === "true") {
            console.warn(
              "Material fallback render failed; using storyboard fallback.",
              error instanceof Error ? error.message : error
            );
          }
          return renderFallbackShotClip({
            shot,
            aspectRatio: input.aspectRatio,
            outputDir: input.outputDir,
            index: clipPaths.length
          });
        })
      );
      clipStats.fallbackClips += 1;
    }
  }
  clipStats.totalClips = clipPaths.length;

  const renderSource = getRenderSourceFromClipStats(
    clipStats,
    input.shots.length,
    usedStoryboardFallback
  );

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

  const shouldMixSyntheticAudio = Boolean(input.audio?.voiceEnabled || input.audio?.bgmEnabled);
  const audio = await buildAudioInputs({
    audio: shouldMixSyntheticAudio ? input.audio : undefined,
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
    resolution,
    renderSource,
    clipStats
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
