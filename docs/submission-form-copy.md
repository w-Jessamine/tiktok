# 飞书表单可复制内容

## 作品链接

项目名称：TikTok Shop VideoPilot  
参赛课题：电商场景 AIGC 带货视频生成系统  
团队名称：我的刀盾队  
团队成员：曹喆、王佳铭，南京大学  
源代码仓库：https://github.com/MichaelCao0/tiktok  
在线 Demo：https://michaelcao0.github.io/tiktok/  
演示视频：本地已生成 `artifacts/videopilot-demo-video.mp4`，4:00，1920x1080，30fps，约 25MB；上传到公开视频平台后替换为最终链接。

快速体验方式：

1. 克隆仓库后执行 `pnpm install`
2. 快速前端预览：`pnpm --filter @videopilot/web dev`
3. 打开 `http://localhost:5173`
4. 如果 API / DB / Redis 未启动，前端会自动切换到 `Local reviewer data`，可直接体验素材库、剧本工作台、创作工作台、任务 trace、数据看板和真实 Seedance 成片样例。
5. 完整链路按 README 启动 Docker Compose、API、Worker 和 Web。

仓库内置真实 Seedance 成片样例：`apps/web/public/demo/seedance-beauty.mp4`，10 秒竖版 9:16，720x1280，导出来源标记为 `ARK_GENERATED`。

## 作品附件（如有）

建议上传本地附件：

- `artifacts/videopilot-submit-pack.zip`：提报材料、README、GitHub Pages 静态站、架构/API 文档和视频样例。
- `artifacts/videopilot-source-code.zip`：不含依赖、密钥、本地生成缓存的源码快照，便于评委在仓库链接异常时复核代码。
- `artifacts/videopilot-demo-video.mp4`：4 分钟项目演示视频，可直接上传为演示视频附件或公开视频链接来源。

`videopilot-submit-pack.zip` 内容包括：

- `submission-form-copy.md`：飞书表单可复制内容
- `submission.md`：正式提报文档
- `README.md`：项目简介与运行说明
- `docs/index.html`：可部署到 GitHub Pages 的静态项目首页
- `docs/architecture.md` / `docs/api.md`：架构与接口说明
- `docs/demo/seedance-beauty.mp4`：真实 Seedance 生成样例
- `docs/demo/seedance-beauty.jpg`：样例封面
- `docs/demo/videopilot-demo-video.mp4`：4 分钟演示视频
- `docs/assets/screens/`：Pages 首页使用的产品截图

说明：附件和仓库不包含真实 API Key、模型 Endpoint、账号、额度或其他敏感资源信息；火山方舟 / Seedance 参数通过 `.env` 或部署平台 Secret 外部配置。

## 团队分工说明（仅团队参加填写）

团队名称：我的刀盾队  
学校：南京大学  
团队成员：曹喆、王佳铭

分工说明：

- 曹喆：负责产品设计与前端体验，重点包括素材库、剧本工作台、创作工作台、分镜编辑、任务中心、预览导出、数据看板和演示路径设计。
- 王佳铭：负责后端、AI 与工程链路，重点包括 Fastify API、Prisma 数据模型、Redis + BullMQ 长任务、生成 trace、Ark / Seedance Provider、Prompt compiler、FFmpeg 视频渲染、合规审核和交付文档。
- 共同完成：围绕课题要求梳理 P0/P1/P2 能力范围，联调端到端流程，打磨 Seedance 真实生成样例、README、架构说明和最终提报材料。

## 其他补充说明

TikTok Shop VideoPilot 的定位不是单点“文生视频”工具，而是面向商家的 AIGC 带货视频生成工作台。系统覆盖“素材库建设 → 剧本生成 → 视频创作 → 数据回流反哺”的主链路，并把素材来源声明、合规审核、任务 trace、失败兜底和 A/B 因子看板纳入产品体验。

P0 必做能力已覆盖：商品素材上传、剧本生成、基础分镜、一键成片、任务进度、预览导出。P1 能力覆盖素材标签 / slice 检索、分镜级编辑、TTS/BGM Provider、字幕、失败重试、生成过程 trace 和 mock 数据看板。P2 能力覆盖 Agent-style Prompt 编排、A/B 自动出片、创作因子归因雏形、CI 质量门禁、合规审核流和 reviewer fallback 长任务体验。

真实模型证据方面，仓库内置一条脱敏后的 Seedance 双分镜成片样例，位于 `apps/web/public/demo/seedance-beauty.mp4`。视频由已有 Seedance 片段复用并通过本系统 FFmpeg 渲染器完成字幕与 CTA 后期，导出标记为 `ARK_GENERATED`。Prompt、trace 和 manifest 均做脱敏处理，不展示 API Key、Endpoint 或资源额度。

如果评委只想快速看项目价值，可以直接启动前端进入 `Local reviewer data` 模式；如果需要验证完整工程链路，可以按照 README 启动 Postgres、Redis、MinIO、API、Worker 和 Web，执行 seed 后体验端到端任务。
