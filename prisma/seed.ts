import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const templates = [
  {
    name: "Pain Point Hook",
    strategy: "Start with a recognizable daily frustration, reveal product, prove benefit, close with CTA.",
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

const main = async () => {
  for (const template of templates) {
    const id = template.name.toLowerCase().replace(/\s+/g, "-");
    const existing = await prisma.creativeTemplate.findUnique({ where: { id } });
    if (existing) {
      await prisma.creativeTemplate.update({
        where: { id },
        data: template
      });
    } else {
      await prisma.creativeTemplate.create({
        data: {
          id,
          ...template
        }
      });
    }
  }
};

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
