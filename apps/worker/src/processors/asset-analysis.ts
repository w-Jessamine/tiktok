import { createAiProvider } from "@videopilot/ai";
import { generateVideoThumbnail } from "@videopilot/video";
import path from "node:path";
import { config } from "../config";
import { prisma } from "../db";
import { appendTrace, updateJob } from "../services/job-trace";

const ai = createAiProvider();

const isVideoAsset = (type: string, url: string) =>
  type.includes("VIDEO") || /\.(mp4|mov|webm|m4v)$/i.test(url);

const localPublicUrl = (filePath: string) => {
  const normalized = filePath.replace(/\\/g, "/");
  const storageIndex = normalized.lastIndexOf("storage/");
  if (storageIndex >= 0) {
    return `${config.LOCAL_PUBLIC_STORAGE_URL}/${normalized.slice(storageIndex + "storage/".length)}`;
  }
  return filePath;
};

const generateSliceThumbnail = async (input: {
  assetUrl: string;
  assetType: string;
  assetThumbnailUrl?: string | null;
  assetId: string;
  index: number;
  startMs: number;
  endMs: number;
}) => {
  if (!isVideoAsset(input.assetType, input.assetUrl)) {
    return input.assetThumbnailUrl ?? input.assetUrl;
  }
  try {
    const thumbnail = await generateVideoThumbnail({
      sourceUrl: input.assetUrl,
      startMs: input.startMs,
      endMs: input.endMs,
      outputDir: path.resolve(config.WORKER_OUTPUT_DIR, "thumbnails", input.assetId),
      filenamePrefix: `slice-${input.index + 1}`
    });
    return localPublicUrl(thumbnail.filePath);
  } catch {
    return input.assetThumbnailUrl ?? null;
  }
};

export const processAssetAnalysis = async (data: { jobId: string; assetId: string }) => {
  await updateJob(data.jobId, { status: "RUNNING", progress: 15 });
  const asset = await prisma.asset.findUniqueOrThrow({
    where: { id: data.assetId },
    include: { product: true }
  });
  await appendTrace(data.jobId, "analysis", "Starting multimodal asset analysis.");
  const analysis = await ai.analyzeAsset({
    filename: asset.filename,
    type: asset.type,
    sourceStatement: asset.sourceStatement,
    product: asset.product
      ? {
          title: asset.product.title,
          category: asset.product.category,
          sellingPoints: asset.product.sellingPoints,
          audience: asset.product.audience,
          scenario: asset.product.scenario,
          productUrl: asset.product.productUrl ?? undefined,
          language: asset.product.language
        }
      : undefined
  });

  await prisma.asset.update({
    where: { id: asset.id },
    data: {
      productTags: analysis.productTags,
      videoSummary: analysis.videoSummary,
      embedding: analysis.embedding
    }
  });
  await prisma.assetSlice.deleteMany({ where: { assetId: asset.id } });
  const slicesWithThumbnails = await Promise.all(
    analysis.slices.map(async (slice, index) => ({
      assetId: asset.id,
      startMs: slice.startMs,
      endMs: slice.endMs,
      thumbnailUrl: await generateSliceThumbnail({
        assetUrl: asset.url,
        assetType: asset.type,
        assetThumbnailUrl: asset.thumbnailUrl,
        assetId: asset.id,
        index,
        startMs: slice.startMs,
        endMs: slice.endMs
      }),
      summary: slice.summary,
      tags: slice.tags,
      embedding: analysis.embedding,
      isUsable: true
    }))
  );
  await prisma.assetSlice.createMany({ data: slicesWithThumbnails });
  await appendTrace(data.jobId, "analysis", "Asset tags, summary and slices are ready.", {
    tags: analysis.productTags,
    slices: analysis.slices.length,
    thumbnails: slicesWithThumbnails.filter((slice) => slice.thumbnailUrl).length
  });
  await updateJob(data.jobId, {
    status: "COMPLETED",
    progress: 100,
    output: { assetId: asset.id, sliceCount: analysis.slices.length }
  });
};
