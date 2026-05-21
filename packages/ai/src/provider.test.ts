import { describe, expect, it } from "vitest";
import { createAiProvider, MockAiProvider, writeArkVideoDebugSample } from "./index";

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

  it("mock embeddings are normalized and stable", async () => {
    const provider = new MockAiProvider();
    const first = await provider.embed("same factor");
    const second = await provider.embed("same factor");
    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
  });

  it("redacts Ark video debug samples to shape-only metadata", async () => {
    const { sample } = await writeArkVideoDebugSample(
      {
        id: "task-1",
        status: "succeeded",
        content: { video_url: "https://example.test/video.mp4" },
        apiKey: "should-not-be-saved"
      },
      "storage/test-ark-debug"
    );
    expect(sample.idPaths).toContain("id");
    expect(sample.statusPaths).toContain("status");
    expect(sample.urlPaths).toContain("content.video_url");
    expect(JSON.stringify(sample)).not.toContain("should-not-be-saved");
  });
});
