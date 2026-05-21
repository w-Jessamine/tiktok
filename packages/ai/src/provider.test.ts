import { describe, expect, it } from "vitest";
import { createAiProvider, MockAiProvider } from "./index";

describe("AI providers", () => {
  it("falls back to mock when hybrid env has no secret", async () => {
    const provider = createAiProvider({ AI_PROVIDER: "hybrid" } as NodeJS.ProcessEnv);
    const result = await provider.embed("conversion hook");
    expect(result.length).toBeGreaterThan(0);
  });

  it("mock provider creates scripts under 15 seconds", async () => {
    const provider = new MockAiProvider();
    const scripts = await provider.generateScripts({
      count: 1,
      product: {
        id: "p1",
        title: "Glow Serum",
        category: "Beauty",
        sellingPoints: ["fast absorption"],
        audience: "busy skincare shoppers",
        scenario: "morning skincare",
        language: "en-US"
      }
    });
    const total = scripts[0]!.shots.reduce((sum, shot) => sum + shot.durationMs, 0);
    expect(total).toBeLessThanOrEqual(15000);
  });
});
