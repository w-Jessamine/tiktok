FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache ffmpeg && corepack enable
COPY . .
RUN pnpm install --frozen-lockfile=false && pnpm --filter @videopilot/worker build

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache ffmpeg && corepack enable
COPY --from=build /app /app
CMD ["pnpm", "--filter", "@videopilot/worker", "start"]
