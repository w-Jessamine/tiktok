import { ArkAiProvider } from "../packages/ai/dist/ai/src/index.js";

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is required. Set it in your local shell or .env runner, not in source.`
    );
  }
  return value;
};

const redactUrl = (url) => {
  if (!url) {
    return undefined;
  }
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname.split("/").slice(0, 2).join("/")}/...`;
  } catch {
    return "unparseable-url";
  }
};

requireEnv("ARK_API_KEY");
requireEnv("ARK_TEXT_MODEL");

const mode = process.argv.includes("--video") ? "text-and-video" : "text-only";
const provider = new ArkAiProvider(process.env);

const product = {
  id: "ark-smoke-product",
  title: "GlowLift Travel Serum",
  category: "Beauty",
  sellingPoints: ["fast-absorbing texture", "no sticky finish", "travel pouch friendly"],
  audience: "busy skincare shoppers",
  scenario: "rushed morning skincare",
  language: "en-US"
};

const scripts = await provider.generateScripts({
  product,
  count: 1,
  prompt:
    "Generate a TikTok Shop conversion script with a visible first-three-second hook, product reveal, proof demo and safe CTA.",
  templateName: "Pain Point Rescue"
});

const script = scripts[0];
if (!script) {
  throw new Error("Ark text generation returned no scripts.");
}

console.log(
  JSON.stringify(
    {
      mode,
      text: {
        scriptTitle: script.title,
        shotCount: script.shots.length,
        durationMs: script.shots.reduce((sum, shot) => sum + shot.durationMs, 0),
        firstShot: {
          visualPrompt: script.shots[0]?.visualPrompt,
          subtitle: script.shots[0]?.subtitle,
          materialQuery: script.shots[0]?.materialQuery
        }
      }
    },
    null,
    2
  )
);

if (mode === "text-and-video") {
  requireEnv("ARK_VIDEO_MODEL");
  const shot = script.shots[0];
  if (!shot) {
    throw new Error("No shot available for Ark video smoke.");
  }
  const output = await provider.generateShotVideo({
    shot,
    productTitle: product.title,
    aspectRatio: "VERTICAL_9_16"
  });
  console.log(
    JSON.stringify(
      {
        video: {
          provider: output.provider,
          status: output.status,
          taskIdShape: output.taskId
            ? `${output.taskId.slice(0, 4)}...${output.taskId.length}`
            : null,
          hasUrl: Boolean(output.url),
          urlShape: redactUrl(output.url),
          note: output.note,
          debugSample: output.debugSample
        }
      },
      null,
      2
    )
  );
}
