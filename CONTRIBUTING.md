# Contributing

## Development Workflow

1. Create a branch from `main`.
2. Keep secrets in `.env`; never commit real API keys, account names, endpoint IDs, or quota details.
3. Make scoped changes that preserve the product path: asset intake, script generation, video creation, job trace, and analytics.
4. Run the local quality gate before opening a pull request:

```bash
pnpm check
```

Or run the gates individually:

```bash
pnpm format:check
pnpm stylelint
pnpm lint
pnpm prisma:validate
pnpm prisma:generate
pnpm typecheck
pnpm test
pnpm build
```

On Windows PowerShell environments that block `.ps1` shims, prefix with:

```bash
npm.cmd exec --yes pnpm@9.12.3 -- <script>
```

## Engineering Standards

- Prefer shared Zod schemas in `packages/shared` for API contracts.
- Keep provider-specific AI details isolated inside `packages/ai`.
- Keep long-running work in `apps/worker`; API routes should enqueue jobs and return quickly.
- Add trace events for any user-visible long task stage.
- Keep video exports under 15 seconds.
- Use fallback behavior for model or media failures so demos remain stable.
- Update docs when adding public APIs, environment variables, or demo flow changes.

## Commit Guidance

Use concise imperative messages, for example:

```text
Add factor metric ingestion
Fix worker retry trace output
Document Ark video fallback
```
