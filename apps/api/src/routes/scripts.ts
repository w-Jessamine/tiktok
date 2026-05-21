import type { FastifyInstance } from "fastify";
import { scriptGenerateSchema, scriptPatchSchema, type ScriptModel } from "@videopilot/shared";
import { createAiProvider } from "@videopilot/ai";
import { prisma } from "../db/prisma";
import { runComplianceReview } from "../services/compliance";

const ai = createAiProvider();

const persistScript = async (script: ScriptModel) => {
  return prisma.script.create({
    data: {
      productId: script.productId,
      templateId: script.templateId ?? null,
      title: script.title,
      narrative: script.narrative,
      visualStyle: script.visualStyle,
      language: script.language,
      constraints: script.constraints,
      prompt: script.prompt,
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
};

export const registerScriptRoutes = async (app: FastifyInstance) => {
  app.post("/api/scripts/generate", async (request, reply) => {
    const input = scriptGenerateSchema.parse(request.body);
    const product = await prisma.product.findUniqueOrThrow({ where: { id: input.productId } });
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
      prompt: input.prompt,
      count: input.count
    });
    const created = await Promise.all(scripts.map((script) => persistScript(script)));
    await Promise.all(
      created.map((script) => runComplianceReview({ objectType: "SCRIPT", objectId: script.id }))
    );
    return reply.send({ data: created, requestId: request.id });
  });

  app.get("/api/scripts", async (request, reply) => {
    const query = request.query as { productId?: string };
    const scripts = await prisma.script.findMany({
      where: { productId: query.productId },
      include: { shots: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "desc" }
    });
    return reply.send({ data: scripts, requestId: request.id });
  });

  app.patch("/api/scripts/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const input = scriptPatchSchema.parse(request.body);
    const updated = await prisma.$transaction(async (tx) => {
      const script = await tx.script.update({
        where: { id: params.id },
        data: {
          title: input.title,
          narrative: input.narrative,
          visualStyle: input.visualStyle,
          constraints: input.constraints,
          prompt: input.prompt,
          version: { increment: 1 }
        }
      });
      if (input.shots) {
        await tx.storyboardShot.deleteMany({ where: { scriptId: params.id } });
        await tx.storyboardShot.createMany({
          data: input.shots.map((shot) => ({
            scriptId: params.id,
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
        });
      }
      return tx.script.findUniqueOrThrow({
        where: { id: script.id },
        include: { shots: { orderBy: { order: "asc" } } }
      });
    });
    return reply.send({ data: updated, requestId: request.id });
  });
};
