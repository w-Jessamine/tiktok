import { describe, expect, it } from "vitest";
import { aggregateFactorMetrics, parseAnalyticsCsvRows } from "./analytics";

describe("analytics services", () => {
  it("aggregates conversion metrics with ROI, CPA and AOV", () => {
    const rows = aggregateFactorMetrics([
      {
        factor: "Pain Hook",
        impressions: 1000,
        clicks: 80,
        conversions: 8,
        gmvCents: 24000,
        spendCents: 6000,
        watchSeconds: 900,
        channel: "ads",
        source: "csv"
      },
      {
        factor: "Pain Hook",
        impressions: 500,
        clicks: 20,
        conversions: 2,
        gmvCents: 6000,
        spendCents: 1500,
        watchSeconds: 300,
        channel: "ads",
        source: "manual"
      }
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.ctr).toBeCloseTo(100 / 1500);
    expect(rows[0]?.roi).toBeCloseTo(4);
    expect(rows[0]?.cpa).toBeCloseTo(7.5);
    expect(rows[0]?.aov).toBeCloseTo(30);
    expect(rows[0]?.sources).toEqual(["csv", "manual"]);
  });

  it("parses CSV-shaped analytics rows", () => {
    const rows = parseAnalyticsCsvRows(
      "factor,impressions,clicks,orders,gmv,spend,channel,watchSeconds\nCTA urgency,1200,96,9,270,45,tiktok_ads,1800"
    );

    expect(rows[0]).toMatchObject({
      factor: "CTA urgency",
      impressions: 1200,
      clicks: 96,
      orders: 9,
      gmv: 270,
      spend: 45,
      channel: "tiktok_ads",
      watchSeconds: 1800
    });
  });
});
