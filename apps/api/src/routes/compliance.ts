import type { FastifyInstance } from "fastify";
import { complianceDecisionSchema, complianceReviewSchema } from "@videopilot/shared";
import { prisma } from "../db/prisma";
import { applyComplianceDecision, runComplianceReview } from "../services/compliance";

export const registerComplianceRoutes = async (app: FastifyInstance) => {
  app.post("/api/compliance/review", async (request, reply) => {
    const input = complianceReviewSchema.parse(request.body);
    const review = await runComplianceReview(input);
    return reply.send({ data: review, requestId: request.id });
  });

  app.patch("/api/compliance/:id/decision", async (request, reply) => {
    const params = request.params as { id: string };
    const input = complianceDecisionSchema.parse(request.body);
    const review = await applyComplianceDecision({
      reviewId: params.id,
      status: input.status,
      reviewerNote: input.reviewerNote
    });
    return reply.send({ data: review, requestId: request.id });
  });

  app.get("/api/compliance/reviews", async (request, reply) => {
    const query = request.query as { objectId?: string; objectType?: string };
    const reviews = await prisma.complianceReview.findMany({
      where: {
        objectId: query.objectId,
        objectType: query.objectType as never
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return reply.send({ data: reviews, requestId: request.id });
  });
};
