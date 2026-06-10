import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

const fps = 30;
const sec = (value: number) => Math.round(value * fps);

const palette = {
  ink: "#172033",
  muted: "#687386",
  bg: "#f7f8fb",
  card: "#ffffff",
  line: "#dce2ea",
  teal: "#12b3a8",
  orange: "#ff7a1a",
  plum: "#6d5dfc",
  dark: "#111827",
};

const scenes = {
  opener: sec(14),
  promise: sec(18),
  assets: sec(30),
  scripts: sec(32),
  create: sec(34),
  jobs: sec(28),
  analytics: sec(30),
  architecture: sec(32),
  closing: sec(22),
};

export const totalFrames = Object.values(scenes).reduce(
  (sum, value) => sum + value,
  0,
);

const enter = (frame: number, start = 0, duration = 24) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const Frame = ({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) => (
  <AbsoluteFill
    style={{
      background: dark
        ? `linear-gradient(135deg, ${palette.dark} 0%, #18233d 58%, #183633 100%)`
        : palette.bg,
      color: dark ? "white" : palette.ink,
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: "hidden",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(circle at 12% 18%, rgba(18,179,168,0.20), transparent 30%), radial-gradient(circle at 84% 14%, rgba(255,122,26,0.16), transparent 28%)",
      }}
    />
    {children}
  </AbsoluteFill>
);

const Kicker = ({
  children,
  color = palette.teal,
}: {
  children: React.ReactNode;
  color?: string;
}) => (
  <div
    style={{
      color,
      fontSize: 30,
      fontWeight: 800,
      letterSpacing: 1.4,
      textTransform: "uppercase",
    }}
  >
    {children}
  </div>
);

const Headline = ({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) => (
  <div
    style={{
      fontSize: 78,
      lineHeight: 1.05,
      fontWeight: 900,
      color: dark ? "white" : palette.ink,
      maxWidth: 900,
    }}
  >
    {children}
  </div>
);

const Body = ({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) => (
  <div
    style={{
      fontSize: 35,
      lineHeight: 1.35,
      color: dark ? "rgba(255,255,255,0.78)" : palette.muted,
      maxWidth: 850,
      fontWeight: 520,
    }}
  >
    {children}
  </div>
);

const SceneText = ({
  kicker,
  title,
  body,
  dark = false,
}: {
  kicker: string;
  title: React.ReactNode;
  body: React.ReactNode;
  dark?: boolean;
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 30,
        opacity: enter(frame),
        translate: `0 ${interpolate(enter(frame), [0, 1], [36, 0])}px`,
      }}
    >
      <Kicker>{kicker}</Kicker>
      <Headline dark={dark}>{title}</Headline>
      <Body dark={dark}>{body}</Body>
    </div>
  );
};

const PhoneVideo = ({ large = false }: { large?: boolean }) => (
  <div
    style={{
      width: large ? 420 : 360,
      height: large ? 748 : 640,
      borderRadius: 42,
      padding: 14,
      background: "linear-gradient(180deg, #303646, #111827)",
      boxShadow: "0 36px 90px rgba(0,0,0,0.38)",
    }}
  >
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 30,
        overflow: "hidden",
        background: "#000",
      }}
    >
      <Video
        src={staticFile("media/seedance-beauty.mp4")}
        muted
        loop
        objectFit="cover"
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  </div>
);

const Screenshot = ({ file, title }: { file: string; title: string }) => {
  const frame = useCurrentFrame();
  const progress = enter(frame, 6, 28);
  return (
    <div
      style={{
        width: 1180,
        borderRadius: 28,
        overflow: "hidden",
        background: palette.card,
        border: `1px solid ${palette.line}`,
        boxShadow: "0 34px 80px rgba(23,32,51,0.18)",
        opacity: progress,
        scale: interpolate(progress, [0, 1], [0.97, 1]),
      }}
    >
      <div
        style={{
          height: 58,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 26px",
          borderBottom: `1px solid ${palette.line}`,
          fontSize: 25,
          fontWeight: 800,
          color: palette.ink,
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: 999,
            background: "#ff6b6b",
          }}
        />
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: 999,
            background: "#ffd166",
          }}
        />
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: 999,
            background: "#06d6a0",
          }}
        />
        <span style={{ marginLeft: 16 }}>{title}</span>
      </div>
      <Img
        src={staticFile(`screens/${file}`)}
        style={{
          width: "100%",
          display: "block",
        }}
      />
    </div>
  );
};

const ProductFlowScene = ({
  file,
  title,
  kicker,
  copy,
}: {
  file: string;
  title: string;
  kicker: string;
  copy: string;
}) => (
  <Frame>
    <div
      style={{
        position: "relative",
        height: "100%",
        display: "grid",
        gridTemplateColumns: "560px 1fr",
        alignItems: "center",
        gap: 54,
        padding: "92px 90px",
      }}
    >
      <SceneText kicker={kicker} title={title} body={copy} />
      <Screenshot file={file} title="TikTok Shop VideoPilot" />
    </div>
  </Frame>
);

const Opener = () => {
  const frame = useCurrentFrame();
  return (
    <Frame dark>
      <div
        style={{
          position: "relative",
          height: "100%",
          display: "grid",
          gridTemplateColumns: "1fr 520px",
          alignItems: "center",
          gap: 64,
          padding: "86px 118px",
        }}
      >
        <div
          style={{
            opacity: enter(frame),
            translate: `0 ${interpolate(enter(frame), [0, 1], [34, 0])}px`,
            display: "flex",
            flexDirection: "column",
            gap: 30,
          }}
        >
          <Kicker color={palette.orange}>
            Nanjing University · 我的刀盾队
          </Kicker>
          <Headline dark>
            电商场景 AIGC
            <br />
            带货视频生成系统
          </Headline>
          <Body dark>
            从素材入库、剧本生成、分镜干预到 Seedance
            成片和数据回流，帮助商家快速产出可控、可追踪的短视频素材。
          </Body>
        </div>
        <div
          style={{
            justifySelf: "center",
            opacity: enter(frame, 8, 26),
            scale: interpolate(enter(frame, 8, 26), [0, 1], [0.92, 1]),
          }}
        >
          <PhoneVideo large />
        </div>
      </div>
    </Frame>
  );
};

const PromiseScene = () => (
  <Frame>
    <div
      style={{
        height: "100%",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        alignItems: "center",
        gap: 80,
        padding: "104px 116px",
      }}
    >
      <SceneText
        kicker="Product Value"
        title={
          <>
            不是单点文生视频，
            <br />
            是商家创作闭环
          </>
        }
        body="VideoPilot 把素材、剧本、创作、任务追踪和数据看板连成一条可复核的商家工作流。"
      />
      <div
        style={{
          display: "grid",
          gap: 24,
          fontSize: 36,
          fontWeight: 820,
        }}
      >
        {["素材库建设", "剧本生成", "分镜创作", "数据回流"].map(
          (item, index) => (
            <div
              key={item}
              style={{
                padding: "30px 34px",
                borderRadius: 24,
                background: "white",
                border: `1px solid ${palette.line}`,
                boxShadow: "0 18px 46px rgba(23,32,51,0.10)",
                color: index % 2 === 0 ? palette.ink : palette.teal,
              }}
            >
              {String(index + 1).padStart(2, "0")} · {item}
            </div>
          ),
        )}
      </div>
    </div>
  </Frame>
);

const ArchitectureScene = () => (
  <Frame dark>
    <div
      style={{
        height: "100%",
        display: "grid",
        gridTemplateColumns: "600px 1fr",
        alignItems: "center",
        gap: 74,
        padding: "94px 110px",
      }}
    >
      <SceneText
        dark
        kicker="Engineering"
        title="前后端分离 + 长任务 + 可替换 AI Provider"
        body="React 工作台、Fastify API、Prisma 数据模型、Redis/BullMQ Worker、FFmpeg 渲染器和 Ark/Hybrid/Mock Provider 共同支撑可复核生成链路。"
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
        }}
      >
        {[
          ["Web", "React / Vite"],
          ["API", "Fastify / Prisma"],
          ["Worker", "Redis / BullMQ"],
          ["AI", "Ark / Seedance"],
          ["Video", "FFmpeg Renderer"],
          ["Growth", "A/B + Analytics"],
        ].map(([title, sub]) => (
          <div
            key={title}
            style={{
              minHeight: 140,
              borderRadius: 26,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: 30,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 42, fontWeight: 900 }}>{title}</div>
            <div style={{ fontSize: 28, color: "rgba(255,255,255,0.72)" }}>
              {sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  </Frame>
);

const Closing = () => (
  <Frame dark>
    <div
      style={{
        height: "100%",
        display: "grid",
        gridTemplateColumns: "460px 1fr",
        alignItems: "center",
        gap: 84,
        padding: "86px 130px",
      }}
    >
      <PhoneVideo />
      <SceneText
        dark
        kicker="Final"
        title="让 AIGC 出片服务真实电商增长"
        body="P0 主链路完整覆盖，P1/P2 展示素材检索、分镜编辑、生成 trace、A/B 对比、合规审核和数据回流。"
      />
    </div>
  </Frame>
);

export const MyComposition = () => (
  <AbsoluteFill>
    <Sequence durationInFrames={scenes.opener}>
      <Opener />
    </Sequence>
    <Sequence from={scenes.opener} durationInFrames={scenes.promise}>
      <PromiseScene />
    </Sequence>
    <Sequence
      from={scenes.opener + scenes.promise}
      durationInFrames={scenes.assets}
    >
      <ProductFlowScene
        kicker="01 · Assets"
        title="素材入库与结构化"
        copy="商品图、商品视频和参考素材进入素材库，生成来源声明、标签、摘要、slice 和召回信息。"
        file="assets.png"
      />
    </Sequence>
    <Sequence
      from={scenes.opener + scenes.promise + scenes.assets}
      durationInFrames={scenes.scripts}
    >
      <ProductFlowScene
        kicker="02 · Scripts"
        title="策略 + 因子生成剧本"
        copy="剧本由商品信息、创作模板、Prompt 和合规约束共同驱动，并支持分镜级干预。"
        file="scripts.png"
      />
    </Sequence>
    <Sequence
      from={scenes.opener + scenes.promise + scenes.assets + scenes.scripts}
      durationInFrames={scenes.create}
    >
      <ProductFlowScene
        kicker="03 · Create"
        title="一键成片与 A/B 变体"
        copy="按分镜召回素材，调用 Seedance 生成片段，并由 FFmpeg 控制字幕、CTA、画幅和导出。"
        file="create.png"
      />
    </Sequence>
    <Sequence
      from={
        scenes.opener +
        scenes.promise +
        scenes.assets +
        scenes.scripts +
        scenes.create
      }
      durationInFrames={scenes.jobs}
    >
      <ProductFlowScene
        kicker="04 · Trace"
        title="长任务可追踪"
        copy="模型调用、素材召回、渲染导出和失败兜底都写入任务 trace，方便复核和重试。"
        file="jobs.png"
      />
    </Sequence>
    <Sequence
      from={
        scenes.opener +
        scenes.promise +
        scenes.assets +
        scenes.scripts +
        scenes.create +
        scenes.jobs
      }
      durationInFrames={scenes.analytics}
    >
      <ProductFlowScene
        kicker="05 · Analytics"
        title="创作因子 × 转化效果"
        copy="用 Hook、视觉风格、CTA、字幕密度等因子连接 CTR、CVR、GMV 和 ROI。"
        file="analytics.png"
      />
    </Sequence>
    <Sequence
      from={
        scenes.opener +
        scenes.promise +
        scenes.assets +
        scenes.scripts +
        scenes.create +
        scenes.jobs +
        scenes.analytics
      }
      durationInFrames={scenes.architecture}
    >
      <ArchitectureScene />
    </Sequence>
    <Sequence
      from={
        scenes.opener +
        scenes.promise +
        scenes.assets +
        scenes.scripts +
        scenes.create +
        scenes.jobs +
        scenes.analytics +
        scenes.architecture
      }
      durationInFrames={scenes.closing}
    >
      <Closing />
    </Sequence>
  </AbsoluteFill>
);
