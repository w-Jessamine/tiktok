import path from "node:path";
import { createAiProvider } from "@videopilot/ai";
import { renderStoryboardVideo } from "@videopilot/video";
import type { VideoAspectRatio } from "@videopilot/shared";
import { config } from "../config";
import { prisma } from "../db";
import { appendTrace, updateJob } from "../services/job-trace";

const ai = createAiProvider();

const localPublicUrl = (filePath: string) => {
  const normalized = filePath.replace(/\\/g, "/");
  const storageIndex = normalized.lastIndexOf("storage/");
  if (storageIndex >= 0) {
    return `${config.LOCAL_PUBLIC_STORAGE_URL}/${normalized.slice(storageIndex + "storage/".length)}`;
  }
  return filePath;
};

export const processVideoGeneration = async (data: {
  jobId: string;
  productId: string;
  scriptId: string;
  aspectRatio: VideoAspectRatio;
}) => {
  await updateJob(data.jobId, { status: "RUNNING", progress: 10 });
  const product = await prisma.product.findUniqueOrThrow({ where: { id: data.productId } });
  const script = await prisma.script.findUniqueOrThrow({
    where: { id: data.scriptId },
    include: { shots: { orderBy: { order: "asc" } } }
  });
  await appendTrace(data.jobId, "recall", "Recalling product slices for each storyboard shot.");

  const assets = await prisma.asset.findMany({
    where: { productId: product.id, complianceStatus: "APPROVED" },
    include: { slices: true },
    orderBy: { createdAt: "desc" }
  });
  const slices = assets.flatMap((asset) => asset.slices);

  await updateJob(data.jobId, { progress: 25 });
  for (const shot of script.shots) {
    const selected = slices.find((slice) =>
      `${slice.summary} ${slice.tags.join(" ")}`.toLowerCase().includes(shot.materialQuery.toLowerCase().split(" ")[0] ?? "")
    );
    await prisma.storyboardShot.update({
      where: { id: shot.id },
      data: { selectedSliceId: selected?.id ?? null }
    });
    const generated = await ai.generateShotVideo({
      shot,
      aspectRatio: data.aspectRatio,
      productTitle: product.title,
      imageUrl: assets[0]?.url
    });
    await appendTrace(data.jobId, "shot", `Shot ${shot.order + 1} generated via ${generated.provider}.`, {
      note: generated.note,
      selectedSliceId: selected?.id
    });
  }

  await updateJob(data.jobId, { progress: 70 });
  await appendTrace(data.jobId, "render", "Compositing storyboard, subtitles and export file with FFmpeg.");
  const renderOutput = await renderStoryboardVideo({
    scriptTitle: script.title,
    shots: script.shots,
    aspectRatio: data.aspectRatio,
    outputDir: path.resolve(config.WORKER_OUTPUT_DIR)
  });
  const fileUrl = localPublicUrl(renderOutput.filePath);
  const coverUrl = localPublicUrl(renderOutput.coverPath);
  const exportRow = await prisma.videoExport.create({
    data: {
      scriptId: script.id,
      aspectRatio: data.aspectRatio,
      resolution: renderOutput.resolution,
      durationMs: renderOutput.durationMs,
      fileUrl,
      coverUrl,
      config: {
        renderer: "ffmpeg",
        source: "storyboard-mock-composite"
      }
    }
  });
  await appendTrace(data.jobId, "export", "Video export is ready for preview and download.", {
    fileUrl,
    durationMs: renderOutput.durationMs
  });
  await updateJob(data.jobId, {
    status: "COMPLETED",
    progress: 100,
    output: { exportId: exportRow.id, fileUrl, coverUrl, durationMs: renderOutput.durationMs }
  });
};

export const processShotRegeneration = async (data: {
  jobId: string;
  scriptId: string;
  shotId: string;
  prompt?: string;
  materialQuery?: string;
}) => {
  await updateJob(data.jobId, { status: "RUNNING", progress: 25 });
  const shot = await prisma.storyboardShot.findUniqueOrThrow({ where: { id: data.shotId } });
  await prisma.storyboardShot.update({
    where: { id: shot.id },
    data: {
      visualPrompt: data.prompt ? `${shot.visualPrompt} ${data.prompt}` : shot.visualPrompt,
      materialQuery: data.materialQuery ?? shot.materialQuery,
      generatedUrl: null
    }
  });
  await appendTrace(data.jobId, "shot", "Storyboard shot prompt was regenerated and saved.");
  await updateJob(data.jobId, {
    status: "COMPLETED",
    progress: 100,
    output: { shotId: shot.id }
  });
};
