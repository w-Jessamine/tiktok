# TikTok Shop VideoPilot

TikTok Shop VideoPilot is an AIGC product-video generation MVP for ecommerce sellers. It turns a product brief and owned or licensed product assets into short shoppable videos, while keeping the generation chain traceable, editable and stable through real Ark/Seedance calls plus explicit fallback paths.

The project is built for the competition topic **电商场景 AIGC 带货视频生成系统**. It demonstrates an end-to-end merchant workflow:

```text
Product brief -> Asset library -> Structured material analysis -> Script generation
-> Storyboard editing -> One-click video generation -> Job trace -> Preview/export
-> Factor analytics backflow
```

Project page for judges: `https://michaelcao0.github.io/tiktok/` after enabling GitHub Pages from the `docs/` folder. The same static page is available locally at `docs/index.html` and includes the 4-minute demo video plus the Seedance sample.

## Core Value

Help TikTok Shop merchants create conversion-oriented product videos under 15 seconds from product information and compliant materials. The system does not only generate a script: it connects material management, script strategy, shot-level creation, video rendering, compliance review and factor-level performance analysis into one reproducible workflow.

## Current Completion

This repository is a demo-ready MVP:

- **P0 covered**: product/material upload, script generation, basic storyboard, one-click video generation, task progress, preview and export.
- **P1 mostly covered**: material tags and slice search, storyboard editing, Ark provider with Mock fallback, FFmpeg rendering, subtitles, TTS/BGM provider seams, retryable job trace, mock/manual/CSV analytics, A/B variants and compliance review.
- **P2 partially covered**: Agent-style creative planning, source-labeled rendering, A/B comparison, CI quality gates, manual CodeQL/Docker workflows and extensible ingestion/compliance providers.

Production deployment, real ad-platform sync, external content-safety integration and production-grade observability are intentionally left as extension points.

## Main Features

### Asset Module

- Upload product images, product videos and reference materials.
- Require source statements and keep compliance status on assets.
- Analyze assets into product-level tags, video summaries, slice-level tags and recall metadata.
- Extract real thumbnail frames for video slices with FFmpeg.
- Search materials by keywords, tags and embedding-style scoring.

### Script Module

- Generate ecommerce scripts from product title, category, selling points, target audience and usage scenario.
- Use built-in creative methodologies such as pain-point rescue, scene seeding, comparison proof, material close-up, gift recommendation and promotion CTA.
- Validate generated scripts with Zod schemas.
- Edit storyboard shots, subtitles, durations, material queries and shot ordering.
- Regenerate a single shot without recreating the whole script.

### Creation Module

- Create long-running generation jobs with progress and trace events.
- Compile storyboard shots into Seedance-ready prompts with product truth, visual identity, must-show evidence and compliance constraints.
- Prefer real Ark/Seedance video generation when credentials are configured.
- Fall back explicitly to material-aware FFmpeg mixing or local storyboard preview rendering when model calls fail.
- Render vertical 9:16 and horizontal 16:9 MP4 exports under 15 seconds.
- Label every export as `ARK_GENERATED`, `HYBRID_MIX`, `MATERIAL_MIX`, `DYNAMIC_FALLBACK` or `STORYBOARD_FALLBACK`.

### Growth and Governance

- Create A/B experiments with variants across hook, visual style, CTA, subtitle density and voice tone.
- Track CTR, CVR, GMV, spend, watch time and ROI through mock, manual and CSV data ingestion.
- Review assets, scripts and exports through a rules-based compliance workflow plus manual decisions.
- Preserve trace information for model calls, material recall, audio processing, rendering and retry decisions.

## Tech Stack

| Layer    | Stack                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------ |
| Frontend | React, Vite, TypeScript, Tailwind CSS, TanStack Query, Zustand, dnd-kit, ECharts                 |
| Backend  | Node.js, TypeScript, Fastify, Prisma                                                             |
| Worker   | BullMQ, Redis, FFmpeg                                                                            |
| Data     | PostgreSQL, pgvector-ready schema, S3-compatible object storage                                  |
| AI       | Volcengine Ark-compatible provider, Hybrid provider, Mock provider                               |
| Quality  | ESLint, Prettier, StyleLint, Vitest, Playwright-ready config, Husky, lint-staged, GitHub Actions |

## Repository Layout

```text
apps/web         Merchant-facing React workspace
apps/api         Fastify REST API and SSE job status endpoints
apps/worker      BullMQ processors for asset analysis and video generation
packages/shared  Zod schemas, DTOs and shared TypeScript types
packages/ai      Ark, Hybrid and Mock AI providers plus prompt compiler
packages/video   FFmpeg renderer, subtitles, audio mix and export tools
prisma           Database schema and seed data
scripts          Ark smoke tests and demo video generation scripts
docs             Architecture, API, engineering and submission materials
```

## Architecture

```mermaid
flowchart LR
  Web["Merchant Workspace<br/>React"] --> API["Fastify API"]
  API --> DB["PostgreSQL<br/>Prisma"]
  API --> Queue["BullMQ<br/>Redis"]
  API --> Store["S3-compatible<br/>Object Storage"]
  Queue --> Worker["Worker"]
  Worker --> AI["Ark / Hybrid / Mock<br/>AI Provider"]
  Worker --> Audio["TTS / BGM<br/>Providers"]
  Worker --> Video["FFmpeg<br/>Renderer"]
  Worker --> DB
  Worker --> Store
  API --> Events["Job Events<br/>SSE / Polling"]
  Events --> Web
```

More details are available in:

- [docs/architecture.md](docs/architecture.md)
- [docs/agent-architecture.md](docs/agent-architecture.md)
- [docs/api.md](docs/api.md)
- [docs/engineering.md](docs/engineering.md)
- [docs/submission.md](docs/submission.md)

## Security

Do not commit real API keys, model endpoints, quota details, account names or paid resource identifiers.

Use local `.env` files or deployment platform secrets for sensitive values. `.env.example` intentionally contains empty Ark fields and safe local defaults only.

Useful checks before pushing:

```bash
rg "ark-[A-Za-z0-9-]+|ARK_API_KEY=.+|ARK_TEXT_MODEL=ep-|ARK_VIDEO_MODEL=ep-" .
git status --short
```

## Quick Start

Prerequisites:

- Node.js 20.11 or newer
- pnpm 9.12.3
- FFmpeg available in `PATH`
- Docker only if you want local Postgres, Redis and MinIO through Compose

Install dependencies:

```bash
corepack enable
pnpm install
cp .env.example .env
```

Start local infrastructure:

```bash
docker compose up -d postgres redis minio
pnpm prisma:generate
pnpm prisma:push
pnpm seed
```

Start services:

```bash
pnpm --filter @videopilot/api dev
pnpm --filter @videopilot/worker dev
pnpm --filter @videopilot/web dev
```

Open:

```text
http://localhost:5173
```

Reviewer preview without local infrastructure:

```bash
pnpm --filter @videopilot/web dev
```

If the API, database or Redis are not reachable, the web app switches to local reviewer data. This
mode is a read-oriented product showcase backed by `apps/web/src/lib/demo-data.ts` and the bundled
Seedance evidence clip under `apps/web/public/demo/`. It keeps the UI, source labels, trace and
analytics board understandable without pretending to enqueue real backend jobs. Use the full Docker
Compose path above for end-to-end API, worker, queue and database verification.

On Windows environments where pnpm is not globally available:

```bash
npm.cmd exec --yes pnpm@9.12.3 -- install
npm.cmd exec --yes pnpm@9.12.3 -- prisma:generate
npm.cmd exec --yes pnpm@9.12.3 -- prisma:push
npm.cmd exec --yes pnpm@9.12.3 -- seed
npm.cmd exec --yes pnpm@9.12.3 -- --filter @videopilot/api dev
```

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
ARK_VIDEO_DURATION=5
ARK_VIDEO_RESOLUTION=720p
ARK_VIDEO_GENERATE_AUDIO=false
ARK_VIDEO_DEBUG_SAMPLE=false
TTS_PROVIDER=mock
BGM_PROVIDER=mock
COMPLIANCE_PROVIDER=rules
ANALYTICS_PROVIDER=manual
DATABASE_URL=postgresql://videopilot:videopilot@localhost:5432/videopilot?schema=public
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=videopilot
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
```

`AI_PROVIDER=hybrid` tries Ark first when credentials and model IDs are configured, then falls back to deterministic mock behavior so demos remain stable. The trace records sanitized provider state and fallback reasons.

Use `ARK_TEXT_MODEL` for the reasoning/script endpoint and `ARK_VIDEO_MODEL` for the Seedance video endpoint. Keep `ARK_VIDEO_GENERATE_AUDIO=false` unless the configured video endpoint is known to support native audio generation.

## Demo Commands

```bash
pnpm seed
pnpm demo:ark-video
pnpm demo:ark-video -- --case=beauty --two-shots
pnpm demo:ark-video -- --all-cases --two-shots
pnpm demo:fallback-videos
pnpm ark:smoke
```

`pnpm seed` creates reviewer-friendly product data, assets, scripts, job traces, placeholder exports, A/B variants and metrics. Seeded exports are walkthrough data, not evidence of a real Ark/Seedance run.

`pnpm demo:ark-video` is the real Ark/Seedance path. It consumes video-generation quota, downloads generated clips into `storage/demo-ark-seedance/<case-id>`, stitches them into a vertical MP4 and writes a redacted manifest. Only outputs labeled `ARK_GENERATED` should be treated as full Ark/Seedance video evidence.

This repository also includes one previously generated, reviewer-safe 10-second Seedance evidence
export for the beauty case:

- `apps/web/public/demo/seedance-beauty.mp4`
- `apps/web/public/demo/seedance-beauty.jpg`

The bundled clip is used by local reviewer data so the frontend can demonstrate a true
`ARK_GENERATED` export even when the backend is offline. It is not a substitute for rerunning
`pnpm demo:ark-video` when quota and credentials are available; reruns should be documented through
the redacted manifest and source-labeled export.

`pnpm demo:fallback-videos` renders local dynamic previews without Ark credentials. These are useful for UI and renderer checks but should not be presented as real model output.

`pnpm ark:smoke` validates the Ark text path. Add `-- --video` only when intentionally spending video-generation quota.

## Quality Gates

```bash
pnpm format:check
pnpm stylelint
pnpm lint
pnpm prisma:validate
pnpm prisma:generate
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

GitHub Actions runs the main CI gate on push and pull request. CodeQL and Docker image builds are available as manual workflows so repository settings or cloud resource availability do not block normal development.

## Judge Walkthrough

Recommended review path:

1. Read this README and [docs/submission.md](docs/submission.md).
2. Run `pnpm seed`.
3. Open the web app and visit Assets, Scripts, Create, Jobs and Analytics.
4. Inspect a job trace and export provenance label.
5. Run or review `pnpm demo:ark-video` outputs for real Ark/Seedance evidence.
6. Check [docs/agent-architecture.md](docs/agent-architecture.md) for the creative-agent design.

## Known Boundaries

- Real external ad/TikTok Shop backend sync is not connected; manual and CSV ingestion provide a reproducible substitute.
- External content-safety providers are not connected; the MVP uses rules plus manual review.
- Real station-wide viral-video crawling is not implemented; the MVP uses built-in ecommerce methodologies and uploaded reference-material analysis.
- Video quality depends on model output and prompt specificity. The system records source labels and trace data so fallback outputs are not confused with real Ark output.
- Cloud deployment is scaffolded but the final public demo URL must be supplied separately.
