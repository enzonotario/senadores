# syntax=docker/dockerfile:1

# --- build ---
# En Coolify (poca RAM) NO builds acá: usá la imagen de GHCR (workflow docker-image).
# Este Dockerfile está pensado para runners con ≥4–7 GB (GitHub Actions).
FROM node:22-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@11.12.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG NODE_MAX_OLD_SPACE_SIZE=6144
ENV NITRO_PRESET=node-server
ENV DOCKER_BUILD=1
ENV NODE_OPTIONS=--max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE}
RUN pnpm build

# --- runtime ---
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_OPTIONS=--max-old-space-size=1536

COPY --from=build /app/.output ./.output

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
