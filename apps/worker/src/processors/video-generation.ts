import path from "node:path";
import { createAiProvider } from "@videopilot/ai";
import { renderStoryboardVideo, type RenderMaterial } from "@videopilot/video";
import type { VideoAspectRatio } from "@videopilot/shared";
import { config } from "../config";
import { prisma } from "../db";
import { appendTrace, updateJob } from "../services/job-trace";

const ai = createAiProvider();

const cosineSimilarity = (a: number[], b: number[]) => {
  const length = Math.min(a.length, b.length);
  if (!length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < length; index += 1) {
    dot += (a[index] ?? 0) * (b[index] ?? 0);
    normA += (a[index] ?? 0) ** 2;
    normB += (b[index] ?? 0) ** 2;
  }
  return dot / ((Math.sqrt(normA) || 1) * (Math.sqrt(normB) || 1));
};

const vectorFromJson = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is number => typeof item === "number");
};

const inferMaterialKind = (url: string): RenderMaterial["kind"] => {
  if (/^https?:\/\//i.test(url)) {
    return "remote-video";
  }
  return /\.(mp4|mov|webm|m4v)$/i.test(url) ? "video" : "image";
};

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
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const queryEmbeddings = new Map<string, number[]>();
  const renderMaterials: RenderMaterial[] = [];

  await updateJob(data.jobId, { progress: 25 });
  for (const shot of script.shots) {
    const queryText = `${shot.materialQuery} ${shot.visualPrompt} ${shot.subtitle}`;
    let queryEmbedding = queryEmbeddings.get(queryText);
    if (!queryEmbedding) {
      queryEmbedding = await ai.embed(queryText);
      queryEmbeddings.set(queryText, queryEmbedding);
    }
    const selected = slices
      .map((slice) => {
        const haystack = `${slice.summary} ${slice.tags.join(" ")}`.toLowerCase();
        const keywords = shot.materialQuery.toLowerCase().split(/\s+/).filter(Boolean);
        const lexical = keywords.reduce((score, keyword) => score + (haystack.includes(keyword) ? 1 : 0), 0);
        const similarity = cosineSimilarity(queryEmbedding, vectorFromJson(slice.embedding));
        return { slice, score: lexical * 2 + similarity };
      })
      .sort((a, b) => b.score - a.score)[0]?.slice;
    await prisma.storyboardShot.update({
      where: { id: shot.id },
      data: { selectedSliceId: selected?.id ?? null }
    });
    const selectedAsset = selected ? assetsById.get(selected.assetId) : undefined;
    const generated = await ai.generateShotVideo({
      shot,
      aspectRatio: data.aspectRatio,
      productTitle: product.title,
      imageUrl: assets[0]?.url
    });
    await prisma.storyboardShot.update({
      where: { id: shot.id },
      data: { generatedUrl: generated.url ?? null }
    });
    if (generated.url) {
      renderMaterials.push({
        shotOrder: shot.order,
        url: generated.url,
        kind: "remote-video"
      });
    } else if (selectedAsset?.url) {
      renderMaterials.push({
        shotOrder: shot.order,
        url: selectedAsset.url,
        kind: inferMaterialKind(selectedAsset.url),
        startMs: selected?.startMs,
        endMs: selected?.endMs
      });
    }
    await appendTrace(data.jobId, "shot", `Shot ${shot.order + 1} generated via ${generated.provider}.`, {
      note: generated.note,
      status: generated.status,
      selectedSliceId: selected?.id
    });
  }

  await updateJob(data.jobId, { progress: 70 });
  await appendTrace(data.jobId, "render", "Compositing storyboard, subtitles and export file with FFmpeg.");
  const renderOutput = await renderStoryboardVideo({
    scriptTitle: script.title,
    shots: script.shots,
    aspectRatio: data.aspectRatio,
    materials: renderMaterials,
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
        source: renderMaterials.length > 0 ? "material-aware-mix" : "storyboard-fallback-composite",
        materialCount: renderMaterials.length
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
