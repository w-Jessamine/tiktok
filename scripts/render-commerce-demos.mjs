import { mkdir } from "node:fs/promises";
import path from "node:path";
import { MockAiProvider } from "../packages/ai/dist/ai/src/index.js";
import { renderStoryboardVideo } from "../packages/video/dist/video/src/index.js";

const provider = new MockAiProvider();
const outputRoot = path.resolve(process.cwd(), "storage", "demo-commerce-dynamic");

const demoProducts = [
  {
    id: "demo-beauty-serum",
    title: "GlowLift Travel Serum",
    category: "Beauty",
    sellingPoints: ["fast-absorbing glow texture", "no sticky finish", "travel pouch friendly"],
    audience: "busy skincare shoppers",
    scenario: "rushed morning skincare",
    language: "en-US",
    prompt:
      "Make it feel like a Douyin/TikTok Shop creator demo: fast hook, real texture proof, quick routine payoff and safe CTA.",
    templateName: "Pain Point Rescue"
  },
  {
    id: "demo-storage-box",
    title: "SnapSort Drawer Organizer",
    category: "Home Storage",
    sellingPoints: ["visible before-after reset", "adjustable compartments", "fits small drawers"],
    audience: "apartment renters",
    scenario: "messy drawer reset",
    language: "en-US",
    prompt:
      "Use a before-after storage reset story with satisfying proof cuts and clear product visibility.",
    templateName: "Proof Comparison"
  },
  {
    id: "demo-blender",
    title: "MiniBlend Portable Blender",
    category: "Kitchen",
    sellingPoints: ["single-serve smoothie", "easy rinse cup", "desk and gym bag size"],
    audience: "office workers",
    scenario: "post-workout desk snack",
    language: "en-US",
    prompt: "Make it UGC-style with first-person usage, quick cut ingredients and a practical CTA.",
    templateName: "Scene Seeding"
  }
];

await mkdir(outputRoot, { recursive: true });

for (const product of demoProducts) {
  const [script] = await provider.generateScripts({
    product,
    count: 1,
    prompt: product.prompt,
    templateName: product.templateName
  });

  if (!script) {
    throw new Error(`No script generated for ${product.title}`);
  }

  const slug = product.id.replace(/^demo-/, "");
  const output = await renderStoryboardVideo({
    scriptTitle: script.title,
    shots: script.shots,
    aspectRatio: "VERTICAL_9_16",
    outputDir: path.join(outputRoot, slug),
    audio: {
      voiceEnabled: true,
      bgmEnabled: true,
      voiceLocale: product.language,
      bgmMood: script.shots[0]?.bgmMood,
      voiceVolume: 0.2,
      bgmVolume: 0.1
    }
  });

  console.log(
    JSON.stringify(
      {
        product: product.title,
        script: script.title,
        filePath: output.filePath,
        coverPath: output.coverPath,
        durationMs: output.durationMs,
        resolution: output.resolution,
        renderSource: output.renderSource
      },
      null,
      2
    )
  );
}
