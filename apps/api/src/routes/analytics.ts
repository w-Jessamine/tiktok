import type { FastifyInstance } from "fastify";
import { analyticsImportSchema, factorMetricCreateSchema } from "@videopilot/shared";
import { prisma } from "../db/prisma";
import { aggregateFactorMetrics, parseAnalyticsCsvRows } from "../services/analytics";

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
    const data = aggregateFactorMetrics(rows.length ? rows : factors);
    return reply.send({ data, requestId: request.id });
  });

  app.post("/api/analytics/factors", async (request, reply) => {
    const input = factorMetricCreateSchema.parse(request.body);
    const row = await prisma.factorMetric.create({ data: input });
    return reply.send({ data: row, requestId: request.id });
  });

  app.post("/api/analytics/import", async (request, reply) => {
    const input = analyticsImportSchema.parse(request.body);
    const ingestion = await prisma.analyticsIngestion.create({
      data: {
        source: input.source,
        status: "VALIDATED",
        filename: input.filename,
        rowsReceived: input.rows.length,
        fieldMapping: {
          videoId: "exportId",
          orders: "conversions",
          gmv: "gmvCents",
          spend: "spendCents"
        },
        validation: { rejectedRows: 0 }
      }
    });
    const metrics = await prisma.factorMetric.createMany({
      data: input.rows.map((row) => ({
        productId: row.productId,
        scriptId: row.scriptId,
        exportId: row.videoId,
        variantId: row.variantId,
        factor: row.factor,
        impressions: row.impressions,
        clicks: row.clicks,
        conversions: row.orders,
        gmvCents: Math.round(row.gmv * 100),
        spendCents: Math.round(row.spend * 100),
        watchSeconds: row.watchSeconds,
        channel: row.channel,
        source: input.source.toLowerCase(),
        ingestionId: ingestion.id,
        observedAt: row.date ? new Date(row.date) : new Date()
      }))
    });
    const updated = await prisma.analyticsIngestion.update({
      where: { id: ingestion.id },
      data: { status: "IMPORTED", rowsImported: metrics.count }
    });
    return reply.send({ data: updated, requestId: request.id });
  });

  app.post("/api/analytics/import/csv", async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.badRequest("CSV file is required");
    }
    const csv = (await file.toBuffer()).toString("utf8");
    const input = analyticsImportSchema.parse({
      source: "CSV",
      filename: file.filename,
      rows: parseAnalyticsCsvRows(csv)
    });
    const ingestion = await prisma.analyticsIngestion.create({
      data: {
        source: "CSV",
        status: "VALIDATED",
        filename: input.filename,
        rowsReceived: input.rows.length,
        validation: { rejectedRows: 0 }
      }
    });
    const metrics = await prisma.factorMetric.createMany({
      data: input.rows.map((row) => ({
        productId: row.productId,
        scriptId: row.scriptId,
        exportId: row.videoId,
        variantId: row.variantId,
        factor: row.factor,
        impressions: row.impressions,
        clicks: row.clicks,
        conversions: row.orders,
        gmvCents: Math.round(row.gmv * 100),
        spendCents: Math.round(row.spend * 100),
        watchSeconds: row.watchSeconds,
        channel: row.channel,
        source: "csv",
        ingestionId: ingestion.id,
        observedAt: row.date ? new Date(row.date) : new Date()
      }))
    });
    const updated = await prisma.analyticsIngestion.update({
      where: { id: ingestion.id },
      data: { status: "IMPORTED", rowsImported: metrics.count }
    });
    return reply.send({ data: updated, requestId: request.id });
  });
};
