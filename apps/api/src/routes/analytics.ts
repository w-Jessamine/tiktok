import type { FastifyInstance } from "fastify";
import { analyticsImportSchema, factorMetricCreateSchema } from "@videopilot/shared";
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
    spendCents?: number;
    watchSeconds?: number;
    channel?: string | null;
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
          spend: number;
          watchSeconds: number;
          channels: string[];
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
          spend: 0,
          watchSeconds: 0,
          channels: [],
          sources: []
        });
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
      existing.conversions += row.conversions;
      existing.gmv += row.gmvCents / 100;
      existing.spend += (row.spendCents ?? 0) / 100;
      existing.watchSeconds += row.watchSeconds ?? 0;
      if (row.channel && !existing.channels.includes(row.channel)) {
        existing.channels.push(row.channel);
      }
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

const parseCsvNumber = (value: string | undefined) => Number(value?.trim() || 0);

const parseCsvRows = (csv: string) => {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headers = lines[0]?.split(",").map((header) => header.trim()) ?? [];
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((cell) => cell.trim());
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
    return {
      videoId: row.videoId || undefined,
      variantId: row.variantId || undefined,
      productId: row.productId || undefined,
      scriptId: row.scriptId || undefined,
      channel: row.channel || "csv",
      date: row.date || undefined,
      factor: row.factor || "Imported creative",
      impressions: parseCsvNumber(row.impressions),
      clicks: parseCsvNumber(row.clicks),
      orders: parseCsvNumber(row.orders),
      gmv: parseCsvNumber(row.gmv),
      spend: parseCsvNumber(row.spend),
      watchSeconds: parseCsvNumber(row.watchSeconds)
    };
  });
};

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
      rows: parseCsvRows(csv)
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
