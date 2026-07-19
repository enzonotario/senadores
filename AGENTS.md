# AGENTS.md

Instrucciones para agentes que trabajan en este repo.

## Qué es

Una sola app **Nuxt 4 (SSR)** que sirve **Diputados** y **Senadores** según el `Host`. Misma codebase, dos sitios.

| Cámara | Host local | Host prod |
|--------|------------|-----------|
| Diputados | `diputados.localhost:3200` | `diputados.argentinadatos.com` |
| Senadores | `senadores.localhost:3200` | `senadores.argentinadatos.com` |

`*.localhost` suele bastar (sin `/etc/hosts`). Alternativa: `*.localhost.test` (ver `vite.server.allowedHosts` en `nuxt.config.ts`).

## Arranque

```bash
pnpm install
pnpm dev          # :3200 --host
pnpm build        # SSR Node (Coolify / Docker)
pnpm start        # node .output/server/index.mjs
pnpm build:cf     # preset Cloudflare Workers (opcional)
pnpm preview
pnpm lint
pnpm lint:fix
```

Package manager: **pnpm**.

## Deploy (Coolify / Docker / VPS) — recomendado

Una sola app Node SSR. Ambos dominios apuntan al **mismo** servicio; la cámara sale del `Host`.

No hace falta SQLite/API intermedia por ahora: en un VPS con ≥2 GB RAM las actas (~64 MB diputados) viven en caches en memoria de `*-data.ts` tras el primer hit. Vercel/CF fallaban por **límites de plataforma**, no porque Node no pueda.

```bash
# Local
docker build -t diputados-senadores .
docker run --rm -p 3000:3000 -e NUXT_REVALIDATE_SECRET=dev diputados-senadores
```

En Coolify:

1. Nuevo recurso → **Dockerfile** (raiz del repo).
2. Dominios: `diputados.argentinadatos.com` y `senadores.argentinadatos.com` → mismo servicio.
3. Env: `NUXT_REVALIDATE_SECRET`, `NUXT_PUBLIC_API_BASE_URL` (ver `.env.example`).
4. Puerto `3000`. Healthcheck: `GET /api/health`.
5. Si el build muere con **exit 137**: OOM en el servidor de build. Hace falta ≥2 GB RAM libres (o swap) en el host; el Dockerfile ya usa heap bajo (`1536`) y `DOCKER_BUILD=1` (sin minify Nitro).

Cuando haya movimiento en las cámaras:

```bash
curl -X POST https://senadores.argentinadatos.com/api/revalidate \
  -H "Authorization: Bearer $NUXT_REVALIDATE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"clearData":true}'
```

Eso vacía las caches en RAM; el próximo request vuelve a bajar datos de `api.argentinadatos.com`.

**SQLite / API propia:** solo si más adelante querés varias réplicas sin compartir RAM, o payloads HTML más chicos. Hoy el cuello era serverless (4.5 MB / Worker limits), no el VPS.

### Vercel / Cloudflare (legado)

- No subir `vercel.json` masivo (límite 2048 routes); redirects nombre→id en `server/middleware/legacy-seo.ts`.
- `pnpm build:cf` / `build:vercel` si hace falta. En esos hosts el HTML con actas+votos puede volver a 413/1102.

## Reglas duras

1. **No unificar paths entre cámaras.** Conservar `/diputados`, `/diputados/bloques`, `/senadores`, `/senadores/partidos`, `/actas`. El middleware solo *reescribe* rutas de la cámara equivocada.
2. **Cámara = Host**, no un flag de usuario. Entrypoint: `app/lib/chamber.ts` + `useChamber()` + `middleware/chamber.global.ts`.
3. **Datos separados.** No mezclar tipos ni caches:
   - Diputados → `app/lib/diputados-data.ts` + `types-diputados.ts` → API `/v1/diputados/`
   - Senadores → `app/lib/senadores-data.ts` + `types.ts` → API `/v1/senado/`
4. **UI compartida sí; dominio no.** `HemicicloChart`, filtros, tablas genéricas: OK. Labels/rutas/agrupación: por cámara (`bloque` ≠ `partido`).
5. **Estado de filtros en la URL** (`useRouteQuery` / `useMultiQuery`). No inventar stores para vistas listado.
6. Cambios de UI: preferir **Nuxt UI v4** + Tailwind ya configurados (`app.config.ts`).

## Mapa del código

```
app/
  pages/                 # rutas (diputados/*, senadores/*, actas wrappers)
  components/
    chamber/             # homes por cámara
    actas/               # listado/detalle actas por cámara
    Diputado* Senador*   # dominio
    HemicicloChart.vue   # hemiciclo compartido
  composables/           # useChamber, useMultiQuery, useTableSorting, useApiFetch
  lib/                   # chamber, *-data, types, utils
  utils/                 # bloque, partido, group*, votoTipo, presentismo
  middleware/            # chamber.global.ts
  plugins/               # chamber-seo.ts
server/
  api/health.get.ts                # healthcheck Coolify
  api/revalidate.post.ts           # limpia caches en memoria (+ warm opcional)
  middleware/legacy-seo.ts         # redirects SEO + nombre→id
  assets/legacy-senador-redirects.json  # mapa generado en prepare/build
```

`nuxt.config.ts` usa `appDir: "app"`.

### Rutas

| Path | Notas |
|------|--------|
| `/`, `/actas`, `/actas/[id]` | Wrappers: eligen componente diputados vs senadores vía `useChamber()` |
| `/diputados`, `/diputados/[id]` | Solo host diputados (si no, redirect) |
| `/diputados/bloques`, `/diputados/bloques/[slug]` | Agrupación = **bloque** |
| `/senadores`, `/senadores/[id]` | Solo host senadores |
| `/senadores/partidos`, `/senadores/partidos/[slug]` | Agrupación = **partido** |

### Dominio: diferencias que importan

| | Diputados | Senadores |
|---|-----------|-----------|
| Miembros | ~257 | ~72 |
| Grupo político | `bloque` | `partido` |
| Género en API | sí | no |
| Votos raw | afirmativo/negativo/… | `si`/`no` → normalizar en data layer |

Matching voto↔persona: slug del nombre; diputados tiene lista de aliases en `diputados-data.ts`.

## Dónde tocar qué

| Quiero… | Empiezo en… |
|---------|-------------|
| Cambiar brand/nav/footer/SEO por cámara | `lib/chamber.ts`, `AppNavbar`, `AppFooter`, `plugins/chamber-seo.ts` |
| Nueva página de miembros | `pages/diputados/*` o `pages/senadores/*` (no “genérica” que rompa URLs) |
| Home o actas distintas por cámara | `components/chamber/*`, `components/actas/*` + wrapper en `pages/` |
| Lógica de API / stats | `lib/*-data.ts`, `lib/utils.ts` |
| Hemiciclo / hover grupos | `HemicicloChart.vue` (+ wrappers `DiputadosChart` / `SenadoresChart`) |
| Colores de voto/resultado | `utils/votoTipo.ts`, badges existentes |

## Convenciones de código

- SFC: `<script>` → `<template>` → `<style>` (ESLint).
- `any` permitido (`no-explicit-any` off).
- Formato: Prettier vía ESLint.
- Prefijos de componentes por dominio (`Diputado*`, `Senador*`, `Acta*`).
- Auto-imports de `utils/`: evitar exports con el **mismo nombre** en dos archivos (rompe el auto-import). Helpers compartidos → un solo módulo (ej. `presentismo.ts`).

## Smoke rápido

```bash
curl -sI -H 'Host: diputados.localhost' http://127.0.0.1:3200/
curl -sI -H 'Host: senadores.localhost' http://127.0.0.1:3200/
# Cross-chamber debe 302:
curl -sI -H 'Host: diputados.localhost' http://127.0.0.1:3200/senadores
```
