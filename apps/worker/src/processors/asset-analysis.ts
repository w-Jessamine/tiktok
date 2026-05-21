import { createAiProvider } from "@videopilot/ai";
import { prisma } from "../db";
import { appendTrace, updateJob } from "../services/job-trace";

const ai = createAiProvider();

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
      complianceStatus: "APPROVED",
      embedding: analysis.embedding
    }
  });
  await prisma.assetSlice.deleteMany({ where: { assetId: asset.id } });
  await prisma.assetSlice.createMany({
    data: analysis.slices.map((slice) => ({
      assetId: asset.id,
      startMs: slice.startMs,
      endMs: slice.endMs,
      thumbnailUrl: asset.thumbnailUrl,
      summary: slice.summary,
      tags: slice.tags,
      embedding: analysis.embedding,
      isUsable: true
    }))
  });
  await appendTrace(data.jobId, "analysis", "Asset tags, summary and slices are ready.", {
    tags: analysis.productTags,
    slices: analysis.slices.length
  });
  await updateJob(data.jobId, {
    status: "COMPLETED",
    progress: 100,
    output: { assetId: asset.id, sliceCount: analysis.slices.length }
  });
};
