import { describe, expect, it } from "vitest";
import { getDurationMs, getResolution } from "./index";

describe("video helpers", () => {
  it("caps final duration at 15s", () => {
    const duration = getDurationMs(
      Array.from({ length: 6 }, (_, index) => ({
        order: index,
        durationMs: 4000,
        visualPrompt: "show product",
        cameraMotion: "push",
        materialQuery: "hero",
        subtitle: "Tap to shop",
        voiceover: "Tap to shop",
        bgmMood: "upbeat"
      }))
    );
    expect(duration).toBe(15000);
  });

  it("maps aspect ratios to export resolutions", () => {
    expect(getResolution("VERTICAL_9_16")).toBe("720x1280");
    expect(getResolution("HORIZONTAL_16_9")).toBe("1280x720");
  });
});
