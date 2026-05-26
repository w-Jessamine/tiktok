# API

All API responses use:

```json
{
  "data": {},
  "requestId": "..."
}
```

## Products

`POST /api/products`

Creates a product brief.

```json
{
  "title": "GlowLift Travel Serum",
  "category": "Beauty / Skincare",
  "sellingPoints": ["fast absorption", "travel-friendly"],
  "audience": "busy skincare shoppers",
  "scenario": "morning routine before work",
  "language": "en-US"
}
```

`GET /api/products`

Lists products with assets and scripts.

## Assets

`POST /api/assets/upload`

Multipart form fields:

- `file`
- `productId`
- `type`: `PRODUCT_IMAGE`, `PRODUCT_VIDEO`, `REFERENCE_IMAGE`, `REFERENCE_VIDEO`
- `sourceStatement`

Returns the asset and the queued analysis job.

`GET /api/assets/search?q=&productId=&tag=`

Searches asset summaries, tags and slices.

## Scripts

`POST /api/scripts/generate`

```json
{
  "productId": "...",
  "prompt": "Make the tone premium and trustworthy.",
  "mode": "auto",
  "count": 3
}
```

`PATCH /api/scripts/:id`

Updates script fields and shot list.

## Videos

`POST /api/videos/generate`

```json
{
  "productId": "...",
  "scriptId": "...",
  "aspectRatio": "VERTICAL_9_16",
  "resolution": "720x1280",
  "voiceEnabled": true,
  "bgmEnabled": true,
  "voiceLocale": "en-US",
  "bgmMood": "upbeat"
}
```

`POST /api/videos/experiments`

Creates 2-3 A/B variants for one product and queues a video job for each variant.

```json
{
  "productId": "...",
  "goal": "Compare hook angles",
  "variantCount": 2,
  "aspectRatio": "VERTICAL_9_16",
  "voiceEnabled": false,
  "bgmEnabled": true
}
```

`GET /api/videos/experiments/:id`

Returns experiment variants, queued jobs, exports and metric summaries.

`POST /api/videos/:id/shots/:shotId/regenerate`

Regenerates one storyboard shot prompt/material query.

`GET /api/videos/exports?scriptId=...`

Lists rendered exports. Each export includes `renderSource`:

- `ARK_GENERATED`: every storyboard shot was rendered from Ark video clips.
- `HYBRID_MIX`: output combines Ark clips, merchant material, or local fallback shots.
- `MATERIAL_MIX`: output uses uploaded/merchant-owned media with FFmpeg motion and subtitles.
- `DYNAMIC_FALLBACK`: local animated storyboard preview; not an Ark/Seedance output.
- `STORYBOARD_FALLBACK`: last-resort text storyboard rendering; not final visual quality.

## Jobs

`GET /api/jobs/:id`

Gets job progress and trace.

`GET /api/jobs/:id/events`

Server-Sent Events endpoint for live progress.

`POST /api/jobs/:id/retry`

Requeues a retryable job.

## Analytics

`GET /api/analytics/factors`

Returns aggregated factor attribution data for CTR, CVR and GMV visualization. If no metric rows exist yet, the API returns seeded demo data.

`POST /api/analytics/factors`

Adds one metric observation for data backflow.

```json
{
  "factor": "Creator proof",
  "impressions": 8200,
  "clicks": 640,
  "conversions": 31,
  "gmvCents": 860000,
  "source": "manual-demo"
}
```

`POST /api/analytics/import`

Imports CSV-shaped rows from an external analytics source without requiring live ad-platform credentials.

```json
{
  "source": "CSV",
  "rows": [
    {
      "factor": "Pain Hook",
      "impressions": 12000,
      "clicks": 820,
      "orders": 42,
      "gmv": 1680,
      "spend": 260,
      "channel": "tiktok_ads",
      "watchSeconds": 9300
    }
  ]
}
```

## Compliance

`POST /api/compliance/review`

Runs rules-based compliance review for an asset, script, shot or export.

```json
{
  "objectType": "ASSET",
  "objectId": "..."
}
```

`PATCH /api/compliance/:id/decision`

Stores a manual decision for demo review workflows.

```json
{
  "status": "APPROVED",
  "reviewerNote": "Merchant confirmed source rights."
}
```

## Audio

`POST /api/audio/preview`

Returns preview metadata for the current audio provider. In the MVP, actual fallback audio is mixed during video rendering.
