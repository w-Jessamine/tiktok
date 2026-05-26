# 完赛项目提报草稿

## 基础信息

- 项目名称 / 课题：TikTok Shop VideoPilot / 电商场景 AIGC 带货视频生成系统
- 团队名称与成员名单：待补充
- 分工说明：
  - 前端与产品体验：素材库、剧本工作台、创作工作台、任务中心、数据看板。
  - 后端与长任务链路：Fastify API、Prisma 数据模型、BullMQ 队列、任务 trace 与重试。
  - AI / 视频生成：Ark Provider、Mock fallback、素材分析、剧本生成、FFmpeg 合成、TTS/BGM 接口。
  - 工程与交付：CI、代码规范、README、架构文档、演示脚本与提交材料。

## 一句话核心业务价值

帮助 TikTok Shop 商家把商品信息和自有/授权素材快速转化为可预览、可导出的 15 秒以内带货短视频，并通过分镜编辑、A/B 变体和创作因子数据回流提升内容转化效率。

## 核心功能清单

1. 商品素材上传与来源声明：支持商品图、商品视频、参考素材入库，记录素材来源与合规状态。
2. 多粒度素材结构化：形成商品级标签、视频摘要、slice 级标签、缩略图与 embedding 召回信息。
3. 剧本生成与干预：基于商品信息、Prompt 与模板生成多套剧本，支持分镜拖拽、时长、字幕、素材 query 和单镜头重生成。
4. 一键成片：创建长任务，按分镜召回素材，优先尝试 Ark 视频生成，失败时用素材混剪或 storyboard fallback 稳定导出 MP4。
5. TTS/BGM 与预览导出：提供音频 Provider 抽象和 FFmpeg 混音路径，支持竖版 9:16 与横版 16:9。
6. A/B 自动出片：围绕 Hook、视觉风格、CTA、字幕密度、旁白语气生成多个创意变体并跟踪任务状态。
7. 合规审核流：规则审核 + 人工确认，覆盖素材来源声明、敏感词、商品真实性约束和参考素材使用边界。
8. 数据看板：支持 mock、手动和 CSV 数据回流，展示创作因子与 CTR/CVR/GMV/ROI 等指标的关系。

## 端到端使用流程

用户进入系统后先创建商品 brief，填写标题、类目、卖点、目标人群和使用场景。随后上传商品图、商品视频或参考素材，并声明素材来源；系统会自动进入素材分析与合规审核流程。素材分析完成后，用户可以在素材库中按关键词、标签和 slice 信息检索资产。用户在剧本工作台生成多套短视频剧本，并可调整 Prompt、字幕、镜头描述、分镜顺序和时长。确认剧本后进入创作工作台，选择画幅、TTS/BGM 配置，一键提交视频生成任务，或直接生成 A/B 变体。任务中心展示排队、模型调用、素材召回、音频处理、合成导出的 trace。任务完成后，用户可以在预览区播放并打开 MP4 导出结果。最后，用户可在数据看板导入手动指标或 CSV 样例，查看不同创作因子的转化表现。

## 交付材料

- 在线 Demo 链接：待补充
- 演示视频链接：待补充
- 源代码仓库链接：https://github.com/MichaelCao0/tiktok
- README / 运行说明：见仓库 `README.md`
- API 文档：见 `docs/api.md`
- 架构说明：见 `docs/architecture.md`
- 演示脚本：见 `docs/demo-script.md`

## 技术说明

- 系统架构图：见 `docs/architecture.md`
- 核心技术栈：React、Node.js、TypeScript、Fastify、Prisma、PostgreSQL、Redis、BullMQ、S3-compatible storage、FFmpeg、Volcengine Ark Provider。
- 大模型 / AI 能力使用说明：`packages/ai` 抽象 Ark、Hybrid、Mock Provider。默认 hybrid 模式先尝试真实模型，再回退 Mock，保证演示稳定。Ark 视频任务解析使用兼容层提取 task id、状态、错误和结果 URL，并支持脱敏字段结构采样。
- 视频生成能力说明：`packages/video` 提供素材混剪、storyboard fallback、字幕、封面、TTS/BGM 混音和缩略图抽帧能力。
- 数据回流说明：支持手动写入、JSON import 和 CSV-shaped import，当前不接真实广告后台凭证，但预留 external provider 接口。

## 关键工程难点与解决方案

- 长耗时任务：通过 BullMQ worker、统一 `GenerationJob` 状态机、SSE/polling 查询和 trace 记录解决进度可见性与失败重试。
- 模型不稳定：通过 Zod schema 校验、Ark/Hybrid/Mock Provider 抽象、超时/审核失败 fallback，保证演示链路不断。
- 视频生成链路可复核：无论真实模型是否成功，最终都能通过 FFmpeg 输出 MP4，并在 trace 中记录素材召回、模型调用、音频处理与导出步骤。
- 合规与版权：素材入库必须有来源声明；参考视频只保存结构化分析，不复刻、不混剪原视频；规则审核和人工确认共同控制出片前风险。
- 数据可解释性：将 Hook、风格、字幕密度、CTA 等创作因子与 CTR/CVR/GMV/ROI 聚合展示，体现电商增长闭环。

## 部署与访问说明

本地优先使用 README 中的 pnpm + Docker Compose 运行路径。CI 默认执行 format、stylelint、lint、Prisma validate/generate、typecheck、test、build。Docker build 与 CodeQL 扫描保留为手动工作流，避免未配置云资源或 code scanning 时阻塞主线。

## 项目完成度

当前为可演示 MVP：P0 主链路完整覆盖，P1 覆盖素材检索、分镜编辑、TTS/BGM 接口、trace、失败重试、数据看板、A/B 变体和合规审核；P2 的真实广告后台同步、外部内容安全服务和生产级观测仍为扩展项。

## 项目亮点 / 创新点

1. 不止生成剧本，而是覆盖“素材入库 - 剧本生成 - 分镜编辑 - 视频合成 - 数据回流”的端到端闭环。
2. 用 A/B 自动出片和创作因子看板，把 AIGC 视频生成与电商转化优化连接起来。
3. 通过 Ark + Mock fallback、任务 trace、合规审核和 FFmpeg 稳定导出，兼顾模型创新和工程可复核性。

## 建议补充材料

- 产品截图 / 页面图集：素材库、剧本工作台、创作工作台、任务中心、数据看板。
- 演示视频：建议 3-5 分钟，展示一个商品从 brief 到 A/B 视频导出再到数据看板的完整路径。
- 真实 Ark 校准记录：只展示脱敏字段结构和调用链路，不展示 API Key、Endpoint 资源信息或额度。
