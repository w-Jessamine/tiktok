import { prisma } from "../db/prisma";

type ReviewObjectType = "ASSET" | "SCRIPT" | "SHOT" | "VIDEO_EXPORT";
type ComplianceStatus = "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_REVIEW" | "PROVIDER_FAILED";

const blockedTerms = ["guaranteed cure", "counterfeit", "fake review", "unsafe claim"];

const toText = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(toText).join(" ");
  }
  if (value && typeof value === "object") {
    return Object.values(value).map(toText).join(" ");
  }
  return "";
};

const statusFromHits = (hits: string[]): ComplianceStatus => {
  if (hits.some((hit) => hit.startsWith("blocked_term"))) {
    return "REJECTED";
  }
  if (hits.length > 0) {
    return "NEEDS_REVIEW";
  }
  return "APPROVED";
};

export const runComplianceReview = async (input: {
  objectType: ReviewObjectType;
  objectId: string;
}) => {
  const hits: string[] = [];
  let text = "";
  let relation: { assetId?: string; scriptId?: string; exportId?: string } = {};

  if (input.objectType === "ASSET") {
    const asset = await prisma.asset.findUniqueOrThrow({ where: { id: input.objectId } });
    relation = { assetId: asset.id };
    text = `${asset.filename} ${asset.sourceStatement} ${asset.videoSummary ?? ""} ${asset.productTags.join(" ")}`;
    if (asset.sourceStatement.trim().length < 12) {
      hits.push("missing_or_weak_source_statement");
    }
    if (
      asset.type.startsWith("REFERENCE") &&
      !/public|licensed|owned|permission/i.test(asset.sourceStatement)
    ) {
      hits.push("reference_asset_source_needs_review");
    }
  } else if (input.objectType === "SCRIPT") {
    const script = await prisma.script.findUniqueOrThrow({
      where: { id: input.objectId },
      include: { shots: true }
    });
    relation = { scriptId: script.id };
    text = `${script.title} ${script.narrative} ${script.visualStyle} ${script.constraints.join(" ")} ${toText(script.shots)}`;
    if (!/product|appearance|asset|real/i.test(script.constraints.join(" "))) {
      hits.push("missing_product_truthfulness_constraint");
    }
  } else if (input.objectType === "SHOT") {
    const shot = await prisma.storyboardShot.findUniqueOrThrow({ where: { id: input.objectId } });
    text = `${shot.visualPrompt} ${shot.subtitle} ${shot.voiceover} ${shot.materialQuery}`;
  } else {
    const videoExport = await prisma.videoExport.findUniqueOrThrow({
      where: { id: input.objectId }
    });
    relation = { exportId: videoExport.id };
    text = toText(videoExport.config);
  }

  for (const term of blockedTerms) {
    if (text.toLowerCase().includes(term)) {
      hits.push(`blocked_term:${term}`);
    }
  }

  const status = statusFromHits(hits);
  const review = await prisma.complianceReview.create({
    data: {
      objectType: input.objectType,
      objectId: input.objectId,
      status,
      ruleHits: hits,
      trace: [
        {
          at: new Date().toISOString(),
          stage: "rules",
          message:
            status === "APPROVED"
              ? "Rules review approved the object."
              : "Rules review found issues.",
          meta: { hits }
        }
      ],
      ...relation
    }
  });

  if (input.objectType === "ASSET") {
    await prisma.asset.update({
      where: { id: input.objectId },
      data: { complianceStatus: status }
    });
  }

  return review;
};

export const applyComplianceDecision = async (input: {
  reviewId: string;
  status: "APPROVED" | "REJECTED" | "NEEDS_REVIEW";
  reviewerNote?: string;
}) => {
  const existing = await prisma.complianceReview.findUniqueOrThrow({
    where: { id: input.reviewId }
  });
  const trace = Array.isArray(existing.trace) ? existing.trace : [];
  const review = await prisma.complianceReview.update({
    where: { id: input.reviewId },
    data: {
      status: input.status,
      reviewerNote: input.reviewerNote,
      trace: [
        ...trace,
        {
          at: new Date().toISOString(),
          stage: "manual_decision",
          message: `Reviewer marked object as ${input.status}.`
        }
      ]
    }
  });
  if (review.objectType === "ASSET") {
    await prisma.asset.update({
      where: { id: review.objectId },
      data: { complianceStatus: input.status }
    });
  }
  return review;
};
