import { describe, expect, it } from "vitest";
import {
  compileCommerceShotPrompt,
  createAiProvider,
  MockAiProvider,
  parseArkVideoTaskPayload,
  writeArkVideoDebugSample
} from "./index";

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

  it("compiles Seedance prompts from product truth, methodology factors and shot intent", () => {
    const compiled = compileCommerceShotPrompt({
      product: {
        id: "p-home-1",
        title: "SnapSort Drawer Organizer",
        category: "Home organization",
        sellingPoints: ["adjustable compartments", "visible drawer reset"],
        audience: "small-space shoppers",
        scenario: "messy drawer reset",
        language: "en-US"
      },
      script: {
        title: "SnapSort - Pain Point Rescue",
        narrative: "Hook a messy drawer, prove organization, close with CTA.",
        visualStyle: "first-person UGC product demo",
        constraints: ["final video must be under 15 seconds"]
      },
      shot: {
        order: 2,
        durationMs: 5000,
        visualPrompt: "Show before-after drawer organization with the product in frame.",
        cameraMotion: "macro proof cut",
        materialQuery: "drawer organizer before after proof",
        subtitle: "Cleaner drawers in seconds",
        voiceover: "The adjustable compartments make the reset visible.",
        bgmMood: "bright proof rhythm"
      },
      methodology: {
        templateId: "pain-point-rescue-home-storage-v2",
        templateName: "Pain Point Rescue",
        strategy: "pain point to proof to CTA",
        factors: {
          hook: "messy drawer cold open",
          proof: "before-after organization",
          cta: "routine upgrade CTA"
        },
        source: "built-in methodology library",
        referencePolicy: "abstract pattern only"
      },
      assetHints: ["merchant product image", "merchant product video"]
    });

    expect(compiled.prompt).toContain("SnapSort Drawer Organizer");
    expect(compiled.prompt).toContain("Pain Point Rescue");
    expect(compiled.prompt).toContain("before-after organization");
    expect(compiled.prompt).toContain("merchant product video");
    expect(compiled.prompt).toContain("no burned-in fake app UI");
    expect(compiled.trace.compilerVersion).toBe("commerce-shot-v2");
    expect(compiled.trace.materialQuery).toBe("drawer organizer before after proof");
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

  it("parses Ark video task payloads without treating cover images as video", async () => {
    const parsed = await parseArkVideoTaskPayload({
      data: {
        task_id: "task-real",
        status: "succeeded",
        output: {
          video_url: "https://example.test/result.mp4?token=redacted",
          video_cover_url: "https://example.test/video-cover.jpg?token=redacted"
        }
      }
    });
    expect(parsed.taskId).toBe("task-real");
    expect(parsed.status).toBe("succeeded");
    expect(parsed.artifacts.find((artifact) => artifact.kind === "video")?.url).toContain(
      "result.mp4"
    );
    expect(parsed.artifacts.find((artifact) => artifact.path.includes("cover"))?.kind).toBe(
      "cover"
    );
  });

  it("hybrid shot generation exposes sanitized fallback reasons", async () => {
    const provider = createAiProvider({
      AI_PROVIDER: "hybrid",
      ARK_API_KEY: "unit-test-secret-value",
      ARK_TEXT_MODEL: "unit-test-model-value"
    } as NodeJS.ProcessEnv);
    const result = await provider.generateShotVideo({
      productTitle: "Desk Lamp",
      aspectRatio: "VERTICAL_9_16",
      shot: {
        order: 0,
        durationMs: 2000,
        visualPrompt: "show the lamp on a desk",
        cameraMotion: "slow push",
        materialQuery: "lamp desk",
        subtitle: "Brighten the desk",
        voiceover: "Brighten the desk",
        bgmMood: "upbeat"
      }
    });
    expect(result.provider).toBe("mock");
    expect(result.fallbackReason).toContain("ARK_VIDEO_MODEL");
    expect(result.note).not.toContain("unit-test-secret-value");
    expect(result.note).not.toContain("unit-test-model-value");
  });

  it("uses Ark-compatible video duration defaults", async () => {
    const provider = new MockAiProvider();
    const output = await provider.generateShotVideo({
      productTitle: "Duration Check",
      aspectRatio: "VERTICAL_9_16",
      shot: {
        order: 0,
        durationMs: 2800,
        visualPrompt: "show product duration check",
        cameraMotion: "push",
        materialQuery: "product",
        subtitle: "Duration check",
        voiceover: "Duration check",
        bgmMood: "upbeat"
      }
    });
    expect(output.status).toBe("fallback");
  });
});
