# syntax=docker/dockerfile:1

# --- build ---
FROM node:22-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@11.12.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Coolify builders suelen tener poca RAM: exit 137 = OOM killer.
# No pedir 4GB de heap si el host tiene ~2GB.
ENV NITRO_PRESET=node-server
ENV DOCKER_BUILD=1
ENV NODE_OPTIONS=--max-old-space-size=1536
RUN pnpm build

# --- runtime ---
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
# Actas diputados ~64MB en RAM; margen para el proceso.
ENV NODE_OPTIONS=--max-old-space-size=1536

COPY --from=build /app/.output ./.output

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
