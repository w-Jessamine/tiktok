import { beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueOrThrow = vi.fn();
const create = vi.fn();
const update = vi.fn();

vi.mock("../db/prisma", () => ({
  prisma: {
    asset: {
      findUniqueOrThrow,
      update
    },
    script: {
      findUniqueOrThrow
    },
    storyboardShot: {
      findUniqueOrThrow
    },
    videoExport: {
      findUniqueOrThrow
    },
    complianceReview: {
      create,
      findUniqueOrThrow,
      update
    }
  }
}));

describe("compliance service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks weak asset source statements as needs review", async () => {
    const { runComplianceReview } = await import("./compliance");
    findUniqueOrThrow.mockResolvedValueOnce({
      id: "asset_1",
      filename: "reference.mp4",
      sourceStatement: "unknown",
      videoSummary: "",
      productTags: [],
      type: "REFERENCE_VIDEO"
    });
    create.mockImplementationOnce(({ data }) => Promise.resolve({ id: "review_1", ...data }));

    const review = await runComplianceReview({ objectType: "ASSET", objectId: "asset_1" });

    expect(review.status).toBe("NEEDS_REVIEW");
    expect(review.ruleHits).toContain("missing_or_weak_source_statement");
    expect(update).toHaveBeenCalledWith({
      where: { id: "asset_1" },
      data: { complianceStatus: "NEEDS_REVIEW" }
    });
  });

  it("rejects blocked claims in scripts", async () => {
    const { runComplianceReview } = await import("./compliance");
    findUniqueOrThrow.mockResolvedValueOnce({
      id: "script_1",
      title: "Unsafe claim",
      narrative: "This is a guaranteed cure for shoppers.",
      visualStyle: "demo",
      constraints: ["show real product appearance"],
      shots: []
    });
    create.mockImplementationOnce(({ data }) => Promise.resolve({ id: "review_2", ...data }));

    const review = await runComplianceReview({ objectType: "SCRIPT", objectId: "script_1" });

    expect(review.status).toBe("REJECTED");
    expect(review.ruleHits).toContain("blocked_term:guaranteed cure");
  });
});
