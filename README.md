# TikTok Shop VideoPilot

AIGC ecommerce product video generation MVP for TikTok Shop sellers. The project covers product material intake, structured asset analysis, script generation, storyboard editing, one-click video creation, task tracing, preview/export, and factor-level data backflow.

## Core Value

Turn merchant product information and owned/licensed materials into short shoppable videos under 15 seconds, while keeping the workflow explainable, retryable, and stable through hybrid real-model plus fallback execution.

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, TanStack Query, Zustand, dnd-kit, ECharts
- Backend: Node.js, TypeScript, Fastify, Prisma, BullMQ
- Data: PostgreSQL, pgvector-ready schema, Redis, S3-compatible object storage
- AI: Volcengine Ark-compatible provider, OpenAI SDK compatible client, Hybrid/Mock fallback
- Video: FFmpeg material-aware renderer for preview/export
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

On Windows PowerShell environments that block `.ps1` shims, use:

```bash
npm.cmd exec --yes pnpm@9.12.3 -- install
npm.cmd exec --yes pnpm@9.12.3 -- prisma:generate
npm.cmd exec --yes pnpm@9.12.3 -- prisma:push
npm.cmd exec --yes pnpm@9.12.3 -- --filter @videopilot/api dev
```

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
ARK_VIDEO_MAX_POLLS=12
ARK_VIDEO_POLL_INTERVAL_MS=5000
DATABASE_URL=postgresql://videopilot:videopilot@localhost:5432/videopilot?schema=public
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=videopilot
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
```

`AI_PROVIDER=hybrid` first tries Ark when secrets and models are configured, then falls back to mock generation so demos remain stable.

## User Flow

1. Create a product brief with title, category, selling points, audience and usage scenario.
2. Upload product images, product videos or reference material with a source statement.
3. Worker analyzes assets into product tags, summaries, embeddings and slice-level recall units.
4. Generate three conversion-oriented scripts from product data and optional Prompt guidance.
5. Edit storyboard shots: reorder, change duration, adjust subtitles, update material queries or regenerate one shot.
6. Run one-click video creation in vertical 9:16 or horizontal 16:9.
7. Worker tries Ark async video generation, then falls back to uploaded material mixing or storyboard composite rendering.
8. Watch job progress and trace events, then preview/download the exported MP4.
9. Feed metric observations into the analytics board to show factor-level data backflow.

## Repository Layout

```text
apps/web        React merchant workspace
apps/api        Fastify REST API and SSE job status endpoints
apps/worker     BullMQ processors for asset analysis and video creation
packages/shared Zod schemas, DTOs and shared types
packages/ai     Ark, Hybrid and Mock AI providers
packages/video  FFmpeg material-aware renderer
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

- Tag/slice search with lexical plus embedding scoring
- Shot-level editing
- Ark provider plus fallback
- Material-aware FFmpeg mixing
- Generation trace and retry
- Factor metric backflow board
- Docker and CI scaffolding

P2 documented or partially scaffolded:

- Real ad-platform attribution import
- A/B creative experiments
- Compliance review workflow
- Production observability
