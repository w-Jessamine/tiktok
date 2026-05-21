# Engineering Workflow

## Quality Gates

The repository uses a layered CI gate:

1. Dependency installation with pnpm.
2. Prettier format check.
3. StyleLint for CSS.
4. Prisma schema validation and client generation.
5. ESLint for TypeScript packages.
6. TypeScript typecheck.
7. Vitest unit tests.
8. Production build.
9. CodeQL security analysis.
10. Optional manual Docker image build workflow.

## Branch and Review Rules

- Work from feature branches.
- Open pull requests into `main`.
- Keep PRs focused on one product or infrastructure concern.
- Include validation commands in the PR description.
- Do not include `.env`, real secrets, paid cloud resource IDs, or raw account details.

## Operational Conventions

- `apps/api` owns request validation, REST routes, and fast responses.
- `apps/worker` owns long tasks and retryable generation stages.
- `packages/ai` owns model provider details and fallback behavior.
- `packages/video` owns FFmpeg rendering and media safety fallbacks.
- `packages/shared` owns DTO and schema contracts.

## CI/CD Roadmap

Already implemented:

- CI matrix on Node 20 and 22.
- Format, lint, style, Prisma, typecheck, test, build gates.
- Manual Docker image build checks through `workflow_dispatch`.
- CodeQL scanning.
- Dependabot updates for npm and GitHub Actions.

Future deployment additions:

- Preview environments for pull requests.
- Cloud deploy after green `main`.
- Smoke tests against deployed demo URLs.
- Sentry or OpenTelemetry export for generation task traces.
