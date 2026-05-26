# Demo Script

## 3-5 Minute Recording

1. Open the app and show the merchant workspace navigation.
2. Create the sample product `GlowLift Travel Serum`.
3. Upload one product image or video with source statement.
4. Move to the task center and show asset analysis trace.
5. Generate three scripts from the product brief.
6. Edit a shot subtitle, duration and material query; drag one shot.
7. Generate a vertical 9:16 video.
8. Show task trace and preview/export result.
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

Use this when you want to check the renderer without starting the full database/Redis stack:

```bash
pnpm demo:videos
```

The command writes three vertical 9:16 MP4 files under `storage/demo-commerce-dynamic`.
These are dynamic fallback previews for local demos: they should show motion, overlays,
subtitle rhythm and audio, but they are still not the final target visual quality. The
intended production path remains:

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
