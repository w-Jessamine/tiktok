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
  "resolution": "720x1280"
}
```

`POST /api/videos/:id/shots/:shotId/regenerate`

Regenerates one storyboard shot prompt/material query.

`GET /api/videos/exports?scriptId=...`

Lists rendered exports.

## Jobs

`GET /api/jobs/:id`

Gets job progress and trace.

`GET /api/jobs/:id/events`

Server-Sent Events endpoint for live progress.

`POST /api/jobs/:id/retry`

Requeues a retryable job.

## Analytics

`GET /api/analytics/factors`

Returns mock factor attribution data for CTR, CVR and GMV visualization.
