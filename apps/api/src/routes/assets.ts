import type { FastifyInstance } from "fastify";
import { assetTypeSchema } from "@videopilot/shared";
import { prisma } from "../db/prisma";
import { enqueueGenerationJob } from "../services/queue";
import { putObject } from "../services/storage";

export const registerAssetRoutes = async (app: FastifyInstance) => {
  app.post("/api/assets/upload", async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.badRequest("file is required");
    }

    const fields = file.fields as Record<string, { value?: string }>;
    const productId = fields.productId?.value || undefined;
    const type = assetTypeSchema.parse(fields.type?.value ?? "PRODUCT_IMAGE");
    const sourceStatement =
      fields.sourceStatement?.value ?? "Merchant-owned or licensed ecommerce product material.";
    const buffer = await file.toBuffer();
    const stored = await putObject({
      buffer,
      filename: file.filename,
      contentType: file.mimetype,
      prefix: "assets"
    });

    const asset = await prisma.asset.create({
      data: {
        productId,
        type,
        filename: file.filename,
        objectKey: stored.objectKey,
        url: stored.url,
        sourceStatement,
        complianceStatus: "PENDING",
        productTags: [],
        metadata: {
          mimetype: file.mimetype,
          size: buffer.length
        }
      }
    });

    const job = await prisma.generationJob.create({
      data: {
        type: "ASSET_ANALYSIS",
        status: "QUEUED",
        progress: 0,
        productId,
        input: { assetId: asset.id },
        trace: [
          {
            at: new Date().toISOString(),
            stage: "upload",
            message: "Asset uploaded and queued for multimodal analysis."
          }
        ]
      }
    });
    await enqueueGenerationJob("asset-analysis", { jobId: job.id, assetId: asset.id });
    return reply.send({ data: { asset, job }, requestId: request.id });
  });

  app.get("/api/assets/search", async (request, reply) => {
    const query = request.query as { q?: string; productId?: string; tag?: string };
    const q = query.q?.toLowerCase() ?? "";
    const assets = await prisma.asset.findMany({
      where: {
        productId: query.productId,
        OR: q
          ? [
              { filename: { contains: q, mode: "insensitive" } },
              { videoSummary: { contains: q, mode: "insensitive" } },
              { productTags: { has: q } }
            ]
          : undefined
      },
      include: { slices: true },
      orderBy: { createdAt: "desc" },
      take: 30
    });

    const ranked = assets
      .map((asset) => {
        const text = `${asset.filename} ${asset.videoSummary ?? ""} ${asset.productTags.join(" ")}`.toLowerCase();
        const score = (q && text.includes(q) ? 3 : 0) + (query.tag && asset.productTags.includes(query.tag) ? 2 : 0);
        return { ...asset, score };
      })
      .sort((a, b) => b.score - a.score);
    return reply.send({ data: ranked, requestId: request.id });
  });
};
