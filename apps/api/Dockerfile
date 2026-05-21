FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile=false && pnpm --filter @videopilot/api build

FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY --from=build /app /app
EXPOSE 4000
CMD ["pnpm", "--filter", "@videopilot/api", "start"]
