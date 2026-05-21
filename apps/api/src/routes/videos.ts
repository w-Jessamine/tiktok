import type { FastifyInstance } from "fastify";
import { createAiProvider } from "@videopilot/ai";
import {
  shotRegenerateSchema,
  videoExperimentCreateSchema,
  videoGenerateSchema,
  type ScriptModel
} from "@videopilot/shared";
import { prisma } from "../db/prisma";
import { runComplianceReview } from "../services/compliance";
import { enqueueGenerationJob } from "../services/queue";

const ai = createAiProvider();

const persistScript = async (script: ScriptModel, prompt: string, visualStyle?: string) =>
  prisma.script.create({
    data: {
      productId: script.productId,
      templateId: script.templateId ?? null,
      title: script.title,
      narrative: script.narrative,
      visualStyle: visualStyle ?? script.visualStyle,
      language: script.language,
      constraints: script.constraints,
      prompt,
      version: script.version,
      shots: {
        create: script.shots.map((shot) => ({
          order: shot.order,
          durationMs: shot.durationMs,
          visualPrompt: shot.visualPrompt,
          cameraMotion: shot.cameraMotion,
          materialQuery: shot.materialQuery,
          subtitle: shot.subtitle,
          voiceover: shot.voiceover,
          bgmMood: shot.bgmMood,
          selectedSliceId: shot.selectedSliceId ?? null,
          generatedUrl: shot.generatedUrl ?? null
        }))
      }
    },
    include: { shots: { orderBy: { order: "asc" } } }
  });

const variantPresets = [
  {
    name: "Pain Hook",
    hook: "pain point",
    visualStyle: "fast benefit-led demo",
    cta: "Tap to solve it today",
    subtitleDensity: "high",
    voiceTone: "direct"
  },
  {
    name: "Lifestyle Proof",
    hook: "daily scene",
    visualStyle: "warm UGC lifestyle",
    cta: "Add it to your routine",
    subtitleDensity: "medium",
    voiceTone: "friendly"
  },
  {
    name: "Detail Trust",
    hook: "macro detail",
    visualStyle: "premium close-up editorial",
    cta: "Shop the detail upgrade",
    subtitleDensity: "low",
    voiceTone: "assured"
  }
];

export const registerVideoRoutes = async (app: FastifyInstance) => {
  app.post("/api/videos/generate", async (request, reply) => {
    const input = videoGenerateSchema.parse(request.body);
    const script = await prisma.script.findUniqueOrThrow({
      where: { id: input.scriptId },
      include: { shots: true }
    });
    const assetIssues = await prisma.asset.count({
      where: { productId: input.productId, complianceStatus: { not: "APPROVED" } }
    });
    const scriptReview = await runComplianceReview({ objectType: "SCRIPT", objectId: script.id });
    if (assetIssues > 0 || scriptReview.status === "REJECTED") {
      return reply.code(409).send({
        error: {
          message: "Compliance review must be cleared before final video generation.",
          code: "COMPLIANCE_BLOCKED"
        },
        requestId: request.id
      });
    }

    const job = await prisma.generationJob.create({
      data: {
        type: "VIDEO_GENERATION",
        status: "QUEUED",
        progress: 0,
        productId: input.productId,
        scriptId: script.id,
        variantId: input.variantId,
        input,
        trace: [
          {
            at: new Date().toISOString(),
            stage: "queue",
            message: "Video generation job queued."
          }
        ]
      }
    });
    await enqueueGenerationJob("video-generation", { jobId: job.id, ...input });
    return reply.send({ data: job, requestId: request.id });
  });

  app.post("/api/videos/experiments", async (request, reply) => {
    const input = videoExperimentCreateSchema.parse(request.body);
    const product = await prisma.product.findUniqueOrThrow({ where: { id: input.productId } });
    const experiment = await prisma.videoExperiment.create({
      data: {
        productId: product.id,
        goal: input.goal,
        status: "RUNNING",
        variantCount: input.variantCount,
        config: input
      }
    });

    const variants = [];
    for (const [index, factors] of variantPresets.slice(0, input.variantCount).entries()) {
      const prompt = `${input.goal}. Variant ${index + 1}: hook=${factors.hook}, style=${factors.visualStyle}, CTA=${factors.cta}, subtitle density=${factors.subtitleDensity}, voice=${factors.voiceTone}.`;
      const variant = await prisma.videoVariant.create({
        data: {
          experimentId: experiment.id,
          productId: product.id,
          name: factors.name,
          factors,
          metricSummary: {
            source: "mock-estimate",
            ctr: 0.052 + index * 0.009,
            cvr: 0.031 + index * 0.004,
            gmv: 1200 + index * 380
          }
        }
      });

      const scripts = await ai.generateScripts({
        product: {
          id: product.id,
          title: product.title,
          category: product.category,
          sellingPoints: product.sellingPoints,
          audience: product.audience,
          scenario: product.scenario,
          productUrl: product.productUrl ?? undefined,
          language: product.language
        },
        prompt,
        count: 1,
        templateName: factors.name
      });
      const script = scripts[0];
      if (!script) {
        variants.push(variant);
        continue;
      }

      const createdScript = await persistScript(
        { ...script, title: `${script.title} (${factors.name})` },
        prompt,
        factors.visualStyle
      );
      await runComplianceReview({ objectType: "SCRIPT", objectId: createdScript.id });
      const generationInput = {
        productId: product.id,
        scriptId: createdScript.id,
        aspectRatio: input.aspectRatio,
        resolution: input.aspectRatio === "VERTICAL_9_16" ? "720x1280" : "1280x720",
        voiceEnabled: input.voiceEnabled,
        bgmEnabled: input.bgmEnabled,
        variantId: variant.id
      };
      const videoJob = await prisma.generationJob.create({
        data: {
          type: "VIDEO_GENERATION",
          status: "QUEUED",
          progress: 0,
          productId: product.id,
          scriptId: createdScript.id,
          experimentId: experiment.id,
          variantId: variant.id,
          input: generationInput,
          trace: [
            {
              at: new Date().toISOString(),
              stage: "queue",
              message: "A/B variant video generation queued."
            }
          ]
        }
      });
      await prisma.videoVariant.update({
        where: { id: variant.id },
        data: { scriptId: createdScript.id, jobId: videoJob.id }
      });
      await enqueueGenerationJob("video-generation", { jobId: videoJob.id, ...generationInput });
      variants.push({ ...variant, scriptId: createdScript.id, jobId: videoJob.id });
    }

    return reply.send({ data: { experiment, variants }, requestId: request.id });
  });

  app.get("/api/videos/experiments/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const experiment = await prisma.videoExperiment.findUniqueOrThrow({
      where: { id: params.id },
      include: {
        variants: {
          include: {
            script: { include: { shots: { orderBy: { order: "asc" } } } },
            generationJobs: { orderBy: { createdAt: "desc" }, take: 1 },
            exports: { orderBy: { createdAt: "desc" }, take: 1 },
            metrics: true
          },
          orderBy: { createdAt: "asc" }
        }
      }
    });
    return reply.send({ data: experiment, requestId: request.id });
  });

  app.post("/api/videos/:id/shots/:shotId/regenerate", async (request, reply) => {
    const params = request.params as { id: string; shotId: string };
    const body = shotRegenerateSchema.parse({ ...(request.body as object), shotId: params.shotId });
    const script = await prisma.script.findUniqueOrThrow({ where: { id: params.id } });
    const job = await prisma.generationJob.create({
      data: {
        type: "SHOT_REGENERATION",
        status: "QUEUED",
        progress: 0,
        productId: script.productId,
        scriptId: script.id,
        input: body,
        trace: [
          {
            at: new Date().toISOString(),
            stage: "queue",
            message: "Shot regeneration queued."
          }
        ]
      }
    });
    await enqueueGenerationJob("shot-regeneration", {
      jobId: job.id,
      scriptId: script.id,
      ...body
    });
    return reply.send({ data: job, requestId: request.id });
  });

  app.get("/api/videos/exports", async (request, reply) => {
    const query = request.query as { scriptId?: string };
    const exports = await prisma.videoExport.findMany({
      where: { scriptId: query.scriptId },
      orderBy: { createdAt: "desc" }
    });
    return reply.send({ data: exports, requestId: request.id });
  });
};
