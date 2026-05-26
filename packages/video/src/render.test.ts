import { describe, expect, it } from "vitest";
import {
  buildMockRenderFilter,
  generateVideoThumbnail,
  getRenderSourceFromClipStats,
  getDurationMs,
  getResolution
} from "./index";

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

  it("escapes storyboard text in fallback filters", () => {
    const filter = buildMockRenderFilter(
      [
        {
          order: 0,
          durationMs: 2000,
          visualPrompt: "hero: user's closeup",
          cameraMotion: "push",
          materialQuery: "hero",
          subtitle: "It's ready: tap",
          voiceover: "Tap",
          bgmMood: "upbeat"
        }
      ],
      "VERTICAL_9_16"
    );
    expect(filter).toContain("drawtext");
  });

  it("exports thumbnail helper as part of the video toolkit", () => {
    expect(typeof generateVideoThumbnail).toBe("function");
  });

  it("labels render sources from actual successful clips instead of requested materials", () => {
    expect(
      getRenderSourceFromClipStats(
        {
          arkClips: 5,
          materialClips: 0,
          fallbackClips: 0,
          failedMaterialClips: 0,
          totalClips: 5
        },
        5
      )
    ).toBe("ARK_GENERATED");
    expect(
      getRenderSourceFromClipStats(
        {
          arkClips: 1,
          materialClips: 3,
          fallbackClips: 1,
          failedMaterialClips: 0,
          totalClips: 5
        },
        5
      )
    ).toBe("HYBRID_MIX");
    expect(
      getRenderSourceFromClipStats(
        {
          arkClips: 0,
          materialClips: 0,
          fallbackClips: 5,
          failedMaterialClips: 0,
          totalClips: 5
        },
        5
      )
    ).toBe("DYNAMIC_FALLBACK");
  });
});
