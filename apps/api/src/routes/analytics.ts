import type { FastifyInstance } from "fastify";
import { factorMetricCreateSchema } from "@videopilot/shared";
import { prisma } from "../db/prisma";

const factors = [
  {
    factor: "Pain hook",
    impressions: 18600,
    clicks: 1321,
    conversions: 50,
    gmvCents: 1284000,
    source: "seed"
  },
  {
    factor: "Texture closeup",
    impressions: 15420,
    clicks: 987,
    conversions: 41,
    gmvCents: 1192000,
    source: "seed"
  },
  {
    factor: "Before/after",
    impressions: 23100,
    clicks: 1917,
    conversions: 90,
    gmvCents: 1784000,
    source: "seed"
  },
  {
    factor: "UGC lifestyle",
    impressions: 20210,
    clicks: 1536,
    conversions: 63,
    gmvCents: 1521000,
    source: "seed"
  },
  {
    factor: "CTA urgency",
    impressions: 17330,
    clicks: 1196,
    conversions: 52,
    gmvCents: 1377000,
    source: "seed"
  }
];

const aggregate = (
  rows: Array<{
    factor: string;
    impressions: number;
    clicks: number;
    conversions: number;
    gmvCents: number;
    source: string;
  }>
) =>
  Object.values(
    rows.reduce<
      Record<
        string,
        {
          factor: string;
          impressions: number;
          clicks: number;
          conversions: number;
          gmv: number;
          sources: string[];
        }
      >
    >((acc, row) => {
      const existing =
        acc[row.factor] ??
        (acc[row.factor] = {
          factor: row.factor,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          gmv: 0,
          sources: []
        });
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
      existing.conversions += row.conversions;
      existing.gmv += row.gmvCents / 100;
      if (!existing.sources.includes(row.source)) {
        existing.sources.push(row.source);
      }
      return acc;
    }, {})
  ).map((row) => ({
    ...row,
    ctr: row.impressions ? row.clicks / row.impressions : 0,
    cvr: row.clicks ? row.conversions / row.clicks : 0
  }));

export const registerAnalyticsRoutes = async (app: FastifyInstance) => {
  app.get("/api/analytics/factors", async (request, reply) => {
    const query = request.query as { productId?: string; scriptId?: string };
    const rows = await prisma.factorMetric.findMany({
      where: {
        productId: query.productId,
        scriptId: query.scriptId
      },
      orderBy: { observedAt: "desc" },
      take: 500
    });
    const data = aggregate(rows.length ? rows : factors);
    return reply.send({ data, requestId: request.id });
  });

  app.post("/api/analytics/factors", async (request, reply) => {
    const input = factorMetricCreateSchema.parse(request.body);
    const row = await prisma.factorMetric.create({ data: input });
    return reply.send({ data: row, requestId: request.id });
  });
};
