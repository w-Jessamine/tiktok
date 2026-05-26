export type AnalyticsMetricRow = {
  factor: string;
  impressions: number;
  clicks: number;
  conversions: number;
  gmvCents: number;
  spendCents?: number;
  watchSeconds?: number;
  channel?: string | null;
  source: string;
};

export const aggregateFactorMetrics = (rows: AnalyticsMetricRow[]) =>
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
    cvr: row.clicks ? row.conversions / row.clicks : 0,
    roi: row.spend ? row.gmv / row.spend : 0,
    cpa: row.conversions ? row.spend / row.conversions : 0,
    aov: row.conversions ? row.gmv / row.conversions : 0
  }));

const parseCsvNumber = (value: string | undefined) => Number(value?.trim() || 0);

export const parseAnalyticsCsvRows = (csv: string) => {
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
