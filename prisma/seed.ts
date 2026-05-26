import { PrismaClient, type VideoAspectRatio } from "@prisma/client";

const prisma = new PrismaClient();

const templates = [
  {
    name: "Pain Point Hook",
    strategy:
      "Start with a recognizable daily frustration, reveal product, prove benefit, close with CTA.",
    categories: ["Beauty", "Home", "General"],
    factors: {
      hook: "problem-first",
      visualStyle: "fast demo",
      cta: "tap to shop"
    },
    shotPattern: {
      shots: ["pain", "product reveal", "proof", "routine payoff", "CTA"]
    }
  },
  {
    name: "Lifestyle Seeding",
    strategy: "Use first-person UGC rhythm to place the product inside an aspirational routine.",
    categories: ["Beauty", "Fashion", "Home"],
    factors: {
      hook: "first-person scene",
      visualStyle: "sunny lifestyle",
      cta: "routine upgrade"
    },
    shotPattern: {
      shots: ["scene open", "use", "detail", "reaction", "CTA"]
    }
  },
  {
    name: "Texture Detail",
    strategy: "Lead with material proof and macro closeups to make quality tangible.",
    categories: ["Beauty", "Food", "Home"],
    factors: {
      hook: "macro detail",
      visualStyle: "editorial closeup",
      cta: "quality proof"
    },
    shotPattern: {
      shots: ["macro hook", "scale", "use", "finish", "CTA"]
    }
  },
  {
    name: "Before After",
    strategy: "Contrast messy before with satisfying after to compress value into seconds.",
    categories: ["Home", "Beauty", "Tools"],
    factors: {
      hook: "before-after",
      visualStyle: "split proof",
      cta: "solve now"
    },
    shotPattern: {
      shots: ["before", "product", "transition", "after", "CTA"]
    }
  },
  {
    name: "Giftable Moment",
    strategy: "Frame the product as an easy gift for a specific person and occasion.",
    categories: ["Gift", "Beauty", "Lifestyle"],
    factors: {
      hook: "gift dilemma",
      visualStyle: "warm premium",
      cta: "gift-ready"
    },
    shotPattern: {
      shots: ["occasion", "unbox", "detail", "recipient", "CTA"]
    }
  },
  {
    name: "Limited Offer",
    strategy: "Use urgency and compact proof to make the shopping action feel immediate.",
    categories: ["General"],
    factors: {
      hook: "deal urgency",
      visualStyle: "bold retail",
      cta: "limited offer"
    },
    shotPattern: {
      shots: ["deal", "benefit", "proof", "social cue", "CTA"]
    }
  }
];

const demoProducts = [
  {
    id: "demo-product-glow-serum",
    title: "GlowLift Travel Serum",
    category: "Beauty / Skincare",
    sellingPoints: ["fast absorption", "travel-friendly bottle", "visible dewy finish"],
    audience: "busy skincare shoppers",
    scenario: "morning routine before work",
    productUrl: "https://example.com/products/glowlift-serum",
    language: "en-US",
    factors: ["Pain hook", "Texture closeup", "CTA urgency"],
    assetTags: ["beauty", "texture", "routine", "closeup"],
    slices: [
      "Opening vanity-table hero shot with product clearly visible.",
      "Macro dropper texture close-up showing serum consistency.",
      "Handheld routine moment applying serum before makeup."
    ]
  },
  {
    id: "demo-product-fold-storage",
    title: "FoldMate Drawer Organizer",
    category: "Home / Storage",
    sellingPoints: ["space-saving compartments", "washable fabric", "quick drawer reset"],
    audience: "small-apartment shoppers",
    scenario: "tidying a crowded bedroom drawer",
    productUrl: "https://example.com/products/foldmate-organizer",
    language: "en-US",
    factors: ["Before/after", "UGC lifestyle", "CTA urgency"],
    assetTags: ["home", "storage", "before-after", "lifestyle"],
    slices: [
      "Messy drawer before scene with visible pain point.",
      "Organizer compartments shown from a top-down angle.",
      "Satisfying after shot with clean folded layout."
    ]
  }
];

const vector = (seed: string) => {
  let value = 23;
  for (const char of seed) {
    value = (value * 31 + char.charCodeAt(0)) % 7919;
  }
  return Array.from({ length: 32 }, (_, index) => {
    value = (value * 37 + index * 17) % 8191;
    return Number(((value / 8191) * 2 - 1).toFixed(4));
  });
};

const buildShots = (product: (typeof demoProducts)[number], style: string) =>
  [
    {
      order: 0,
      durationMs: 2400,
      visualPrompt: `Open on ${product.scenario} and reveal the product as the fix.`,
      cameraMotion: "quick push-in",
      materialQuery: `${product.assetTags[0]} hero hook`,
      subtitle: "This routine can be easier",
      voiceover: `${product.title} makes the first step feel effortless.`,
      bgmMood: "confident upbeat"
    },
    {
      order: 1,
      durationMs: 2600,
      visualPrompt: `Show ${product.sellingPoints[0]} in a clear hands-on demo.`,
      cameraMotion: "handheld follow",
      materialQuery: product.sellingPoints[0],
      subtitle: product.sellingPoints[0],
      voiceover: `${product.sellingPoints[0]} is the benefit shoppers notice first.`,
      bgmMood: "clean rhythmic"
    },
    {
      order: 2,
      durationMs: 2600,
      visualPrompt: "Cut to product detail, material, scale or close-up proof.",
      cameraMotion: "macro pan",
      materialQuery: `${product.assetTags[1]} detail proof`,
      subtitle: "Details you can trust",
      voiceover: "The detail shot makes the quality easy to understand.",
      bgmMood: "satisfying pop"
    },
    {
      order: 3,
      durationMs: 2800,
      visualPrompt: `Place the product naturally inside ${product.scenario}.`,
      cameraMotion: "smooth pull-back",
      materialQuery: `${product.assetTags[2]} lifestyle payoff`,
      subtitle: "Fits your day",
      voiceover: `It fits naturally into ${product.scenario}.`,
      bgmMood: "warm lift"
    },
    {
      order: 4,
      durationMs: 2400,
      visualPrompt: "End with packshot, offer cue and clear CTA.",
      cameraMotion: "locked packshot",
      materialQuery: "packshot call to action",
      subtitle: "Tap to shop",
      voiceover: "Tap to shop while the offer is live.",
      bgmMood: "bright finish"
    }
  ].map((shot) => ({ ...shot, visualPrompt: `${shot.visualPrompt} Style: ${style}.` }));

const seedTemplates = async () => {
  for (const template of templates) {
    const id = template.name.toLowerCase().replace(/\s+/g, "-");
    await prisma.creativeTemplate.upsert({
      where: { id },
      update: template,
      create: {
        id,
        ...template
      }
    });
  }
};

const seedProductDemo = async (product: (typeof demoProducts)[number]) => {
  await prisma.product.upsert({
    where: { id: product.id },
    update: {
      title: product.title,
      category: product.category,
      sellingPoints: product.sellingPoints,
      audience: product.audience,
      scenario: product.scenario,
      productUrl: product.productUrl,
      language: product.language
    },
    create: {
      id: product.id,
      title: product.title,
      category: product.category,
      sellingPoints: product.sellingPoints,
      audience: product.audience,
      scenario: product.scenario,
      productUrl: product.productUrl,
      language: product.language
    }
  });

  await prisma.asset.deleteMany({ where: { productId: product.id } });
  await prisma.script.deleteMany({ where: { productId: product.id } });
  await prisma.generationJob.deleteMany({ where: { productId: product.id } });
  await prisma.videoExperiment.deleteMany({ where: { productId: product.id } });
  await prisma.factorMetric.deleteMany({ where: { productId: product.id } });

  const asset = await prisma.asset.create({
    data: {
      productId: product.id,
      type: "PRODUCT_IMAGE",
      filename: `${product.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-hero.jpg`,
      objectKey: `demo/${product.id}/hero.jpg`,
      url: `/storage/demo/${product.id}/hero.jpg`,
      thumbnailUrl: `/storage/demo/${product.id}/hero.jpg`,
      sourceStatement: "Demo merchant-owned or licensed ecommerce product material.",
      complianceStatus: "APPROVED",
      productTags: product.assetTags,
      videoSummary: `Demo structured asset for ${product.title}: hero, detail and usage scenes are ready for recall.`,
      embedding: vector(product.title),
      metadata: { demo: true, note: "Seeded demo asset; file may be replaced by uploaded media." },
      slices: {
        create: product.slices.map((summary, index) => ({
          startMs: index * 3000,
          endMs: index * 3000 + 3000,
          thumbnailUrl: `/storage/demo/${product.id}/slice-${index + 1}.jpg`,
          summary,
          tags: [product.assetTags[index] ?? "product", index === 0 ? "hook" : "proof"],
          embedding: vector(`${product.title}-${summary}`),
          isUsable: true
        }))
      }
    }
  });

  await prisma.complianceReview.create({
    data: {
      objectType: "ASSET",
      objectId: asset.id,
      assetId: asset.id,
      status: "APPROVED",
      ruleHits: [],
      trace: [
        {
          at: new Date().toISOString(),
          stage: "seed",
          message: "Demo asset source statement approved."
        }
      ],
      reviewerNote: "Seeded demo asset with declared merchant-owned/licensed source."
    }
  });

  const script = await prisma.script.create({
    data: {
      productId: product.id,
      templateId: "pain-point-hook",
      title: `${product.title} - Demo Conversion Script`,
      narrative:
        "A seeded five-shot script that moves from shopper pain point to product proof and CTA.",
      visualStyle: "fast benefit-led demo",
      language: product.language,
      constraints: [
        "final video must be under 15 seconds",
        "show real product appearance when assets are available",
        "avoid competitor logos and unsupported claims"
      ],
      prompt: "Seeded demo script for first-run reviewer walkthrough.",
      shots: {
        create: buildShots(product, "fast benefit-led demo")
      }
    },
    include: { shots: true }
  });

  await prisma.videoExport.createMany({
    data: (["VERTICAL_9_16", "HORIZONTAL_16_9"] as VideoAspectRatio[]).map((aspectRatio) => ({
      scriptId: script.id,
      aspectRatio,
      resolution: aspectRatio === "VERTICAL_9_16" ? "720x1280" : "1280x720",
      durationMs: 12800,
      fileUrl: `/storage/demo/${product.id}/${aspectRatio.toLowerCase()}.mp4`,
      coverUrl: `/storage/demo/${product.id}/cover.jpg`,
      config: {
        demo: true,
        renderer: "seeded-placeholder",
        note: "Run the worker generation flow to replace this seeded preview with a real MP4."
      }
    }))
  });

  const job = await prisma.generationJob.create({
    data: {
      type: "VIDEO_GENERATION",
      status: "COMPLETED",
      progress: 100,
      productId: product.id,
      scriptId: script.id,
      input: {
        productId: product.id,
        scriptId: script.id,
        aspectRatio: "VERTICAL_9_16",
        voiceEnabled: true,
        bgmEnabled: true
      },
      output: { demo: true, durationMs: 12800 },
      trace: [
        { at: new Date().toISOString(), stage: "recall", message: "Demo slices recalled." },
        { at: new Date().toISOString(), stage: "render", message: "Demo export prepared." }
      ]
    }
  });

  const experiment = await prisma.videoExperiment.create({
    data: {
      productId: product.id,
      goal: "Compare hook, style and CTA for first-run demo.",
      status: "COMPLETED",
      variantCount: 2,
      config: { demo: true, aspectRatio: "VERTICAL_9_16" }
    }
  });

  const variants = [
    {
      name: "Pain Hook",
      factors: {
        hook: "pain point",
        visualStyle: "fast benefit-led demo",
        cta: "Tap to solve it today",
        subtitleDensity: "high",
        voiceTone: "direct"
      },
      ctr: 0.071,
      cvr: 0.044,
      gmv: 1880
    },
    {
      name: "Lifestyle Proof",
      factors: {
        hook: "daily scene",
        visualStyle: "warm UGC lifestyle",
        cta: "Add it to your routine",
        subtitleDensity: "medium",
        voiceTone: "friendly"
      },
      ctr: 0.064,
      cvr: 0.039,
      gmv: 1620
    }
  ];

  for (const [index, variant] of variants.entries()) {
    const variantRow = await prisma.videoVariant.create({
      data: {
        experimentId: experiment.id,
        productId: product.id,
        scriptId: script.id,
        jobId: job.id,
        name: variant.name,
        factors: variant.factors,
        metricSummary: {
          source: "seed-demo",
          ctr: variant.ctr,
          cvr: variant.cvr,
          gmv: variant.gmv
        }
      }
    });
    await prisma.factorMetric.create({
      data: {
        productId: product.id,
        scriptId: script.id,
        variantId: variantRow.id,
        factor: variant.name,
        impressions: 10000 + index * 1800,
        clicks: Math.round((10000 + index * 1800) * variant.ctr),
        conversions: Math.round((10000 + index * 1800) * variant.ctr * variant.cvr),
        gmvCents: Math.round(variant.gmv * 100),
        spendCents: 24000 + index * 5000,
        watchSeconds: 8200 + index * 900,
        channel: "seed-demo",
        source: "seed"
      }
    });
  }
};

const main = async () => {
  await seedTemplates();
  for (const product of demoProducts) {
    await seedProductDemo(product);
  }
};

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
