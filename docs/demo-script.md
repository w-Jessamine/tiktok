# Demo Script

## 3-5 Minute Recording

1. Open the app and show the merchant workspace navigation.
2. Create the sample product `GlowLift Travel Serum`.
3. Upload one product image or video with source statement.
4. Move to the task center and show asset analysis trace.
5. Generate three scripts from the product brief.
6. Edit a shot subtitle, duration and material query; drag one shot.
7. Queue a vertical 9:16 source-labeled export.
8. Show provider attempt, fallback decision, final render source and preview/export result.
9. Open analytics board, feed one manual metric row, and explain factor attribution backflow.

## Manual Acceptance Checklist

- Product can be created.
- Asset upload returns an analysis job.
- Scripts are generated without real model secrets when `AI_PROVIDER=hybrid`.
- Storyboard editor saves changes.
- Video generation job reaches completed when FFmpeg is installed.
- Export duration is under 15 seconds and uses uploaded material when available.
- No real secrets appear in source, README, docs or logs.

## Local Video Effect Check

Use this when calibrating the real Ark/Seedance video path. It consumes video quota and requires
local environment variables for Ark credentials and model ids:

```bash
pnpm demo:ark-video
pnpm demo:ark-video -- --case=beauty --two-shots
pnpm demo:ark-video -- --all-cases --two-shots
```

The command writes downloaded shot clips, a stitched final MP4 and a redacted manifest under
`storage/demo-ark-seedance/<case-id>`. The manifest should show the full business chain: product
brief, methodology strategy/factors, generated storyboard, `commerce-shot-v2` prompt compiler traces,
Ark shot results and final render provenance. Only this command or a UI export labeled
`ARK_GENERATED` should be treated as Ark/Seedance video evidence. Use
`pnpm demo:ark-video -- --one-shot` when you only need a cheaper connection/schema smoke test,
`-- --two-shots` for a compact 10s case, `-- --case=beauty|storage|kitchen` for a specific product,
`-- --all-cases` for batch Ark generation, or `-- --reuse-existing` to validate stitching with
already-downloaded local clips without spending quota. The demo defaults to deterministic local
commerce scripts plus real Seedance shot generation so video evidence is stable; add `-- --ark-script`
only when script-generation calibration is part of the run.

For model routing, use the strongest available Doubao Seed text endpoint as `ARK_TEXT_MODEL` for
script reasoning and prompt compilation, and use the Seedance video endpoint as `ARK_VIDEO_MODEL`.
Keep `ARK_VIDEO_GENERATE_AUDIO=false` unless the configured Seedance endpoint supports native audio;
when it is enabled, the renderer preserves Ark/Seedance source audio instead of covering it with the
local fallback BGM.

Use this when you want to check the local renderer without starting the full database/Redis stack:

```bash
pnpm demo:fallback-videos
```

The command writes three vertical 9:16 MP4 files under `storage/demo-commerce-dynamic`.
These are dynamic fallback previews for local demos: they should show motion, overlays,
subtitle rhythm and audio, but they are not Ark/Seedance outputs and are not the final target
visual quality. The intended production path remains:

1. Use real merchant images/videos as material inputs whenever available.
2. Try Ark Seedance text/image-to-video for shot-level clips.
3. Fall back to material-aware FFmpeg mixing only when Ark is unavailable, still rendering
   motion, subtitles, CTA cards and audio instead of static storyboard cards.

Use this when calibrating the real Ark account response shape:

```bash
pnpm ark:smoke
pnpm ark:smoke -- --video
```

The first command checks Ark text/script generation. The `--video` command intentionally creates
one video task and should only be used when quota/network access is available. Output is redacted:
it reports script metadata, task status, field paths and URL shape, but not API keys, endpoint
resource details or raw payloads.
