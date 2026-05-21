import type { FastifyInstance } from "fastify";

const factors = [
  { factor: "Pain hook", impressions: 18600, ctr: 0.071, cvr: 0.038, gmv: 12840 },
  { factor: "Texture closeup", impressions: 15420, ctr: 0.064, cvr: 0.042, gmv: 11920 },
  { factor: "Before/after", impressions: 23100, ctr: 0.083, cvr: 0.047, gmv: 17840 },
  { factor: "UGC lifestyle", impressions: 20210, ctr: 0.076, cvr: 0.041, gmv: 15210 },
  { factor: "CTA urgency", impressions: 17330, ctr: 0.069, cvr: 0.044, gmv: 13770 }
];

export const registerAnalyticsRoutes = async (app: FastifyInstance) => {
  app.get("/api/analytics/factors", async (request, reply) => {
    return reply.send({ data: factors, requestId: request.id });
  });
};
