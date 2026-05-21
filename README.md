# TikTok Shop VideoPilot

电商场景 AIGC 带货视频生成系统 MVP。项目面向 TikTok Shop 国际电商商家，覆盖素材入库、结构化理解、剧本生成、分镜编辑、一键成片、任务追踪、预览导出和 mock 转化看板。

## Core Value

商家只需要提供商品信息和素材，就能快速得到可预览、可导出的 15 秒以内带货短视频，并能在分镜级别调整素材、字幕、Prompt 和创作因子。

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, TanStack Query, Zustand, dnd-kit, ECharts
- Backend: Node.js, TypeScript, Fastify, Prisma, BullMQ
- Data: PostgreSQL, pgvector-ready schema, Redis, S3-compatible object storage
- AI: Volcengine Ark-compatible provider, OpenAI SDK compatible client, Mock provider fallback
- Video: FFmpeg renderer for preview/export
- Quality: ESLint, Prettier, StyleLint, Vitest, Playwright-ready E2E, GitHub Actions

## Security

Do not commit real API keys, endpoints, quota details, account names, or paid resource identifiers. Use `.env` locally and deployment secrets in cloud platforms. `.env.example` intentionally contains only variable names and safe defaults.

## Quick Start

```bash
corepack enable
pnpm install
cp .env.example .env
docker compose up -d postgres redis minio
pnpm prisma:generate
pnpm prisma:push
pnpm --filter @videopilot/api dev
pnpm --filter @videopilot/worker dev
pnpm --filter @videopilot/web dev
```

Open `http://localhost:5173`.

If pnpm is not installed globally, `corepack enable` will activate the package manager declared in `package.json`.

## Useful Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose up
```

The Docker Compose path runs Postgres, Redis, MinIO, API, worker and web services together. The worker container installs FFmpeg for video composition.

## Environment Variables

```bash
AI_PROVIDER=hybrid
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_API_KEY=
ARK_TEXT_MODEL=
ARK_VIDEO_MODEL=
ARK_EMBEDDING_MODEL=
DATABASE_URL=postgresql://videopilot:videopilot@localhost:5432/videopilot?schema=public
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=videopilot
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
```

`AI_PROVIDER=hybrid` first tries the Ark provider when secrets and models are configured, then falls back to mock generation so demos remain stable.

## User Flow

1. Create a product brief with title, category, selling points, audience and usage scenario.
2. Upload product images, product videos or reference material with a source statement.
3. Worker analyzes assets into product tags, summaries and slice-level recall units.
4. Generate three conversion-oriented scripts from product data and optional Prompt guidance.
5. Edit storyboard shots: reorder, change duration, adjust subtitles, update material queries or regenerate one shot.
6. Run one-click video creation in vertical 9:16 or horizontal 16:9.
7. Watch job progress and trace events, then preview/download the exported MP4.
8. Review the mock factor attribution board for growth-oriented storytelling.

## Repository Layout

```text
apps/web       React merchant workspace
apps/api       Fastify REST API and SSE job status endpoints
apps/worker    BullMQ processors for asset analysis and video creation
packages/shared Zod schemas, DTOs and shared types
packages/ai    Ark, Hybrid and Mock AI providers
packages/video FFmpeg storyboard renderer
prisma          Data model
docs            Architecture, API and submission materials
```

## MVP Completion

P0:

- Product/material upload
- Script generation
- Basic storyboard
- One-click video generation
- Task progress
- Preview/export

P1:

- Tag/slice search
- Shot-level editing
- Provider fallback
- Generation trace
- Mock analytics board
- Docker and CI scaffolding

P2 documented for future work:

- Real factor attribution
- A/B creative experiments
- Compliance review workflow
- Full Ark video task polling
- Production observability

