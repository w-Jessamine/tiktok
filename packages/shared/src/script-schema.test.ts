import { describe, expect, it } from "vitest";
import { scriptSchema } from "./index";

describe("scriptSchema", () => {
  it("accepts a valid 15s ecommerce script", () => {
    const parsed = scriptSchema.parse({
      productId: "product_1",
      templateId: null,
      title: "Fresh morning routine",
      narrative: "A concise 5-shot demo that moves from pain point to payoff.",
      visualStyle: "bright lifestyle closeups",
      language: "en-US",
      constraints: ["under 15 seconds", "no competitor logos"],
      prompt: "summer tone",
      shots: Array.from({ length: 5 }, (_, index) => ({
        order: index,
        durationMs: 2600,
        visualPrompt: "Show the product in a clean lifestyle setup",
        cameraMotion: "slow push-in",
        materialQuery: "product closeup",
        subtitle: "Upgrade the moment",
        voiceover: "Make every detail feel effortless.",
        bgmMood: "warm upbeat"
      }))
    });

    expect(parsed.shots).toHaveLength(5);
  });
});
