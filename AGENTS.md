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
pnpm build        # SSR Node + hybrid SSG (Coolify / Docker)
pnpm start        # node .output/server/index.mjs
pnpm preview
pnpm lint
pnpm lint:fix
```

Package manager: **pnpm**.

## Deploy (Coolify / Docker / VPS) — recomendado

**Dos servicios Coolify** (misma imagen base, distinto tag y `NUXT_PUBLIC_DEFAULT_CHAMBER`):

| Servicio | Dominio | `IMAGE_TAG` | `NUXT_PUBLIC_DEFAULT_CHAMBER` |
|----------|---------|-------------|-------------------------------|
| Diputados | `diputados.argentinadatos.com` | `diputados-latest` | `diputados` |
| Senadores | `senadores.argentinadatos.com` | `senadores-latest` | `senadores` |

Runtime sigue resolviendo cámara por `Host`; el env fija el **manifiesto SSG** del build (hybrid).

### Hybrid SSG

En build (`app/lib/prerender-manifest.ts` + hook `prerender:routes`):

- Índices (`/`, `/actas`, listados de miembros/grupos)
- Miembros **activos** (sin `/afinidad`: esa ruta es SSR + cache larga)
- Actas con `fecha >= buildDate − 4 años` (rolling, `ACTAS_SSG_YEARS`)

El resto: SSR + `Cache-Control` largo (`max-age=31536000`). Tras deploy, **purge Cloudflare** de esos paths si el CDN cacheó HTML viejo.

Datos en RAM (`*-data.ts`) + mini-API Nitro (`server/api/*`). El browser no baja dumps de `api.argentinadatos.com`. SQLite solo si hay varias réplicas sin RAM compartida.

### Coolify: el VPS no debe compilar Nuxt

El `Dockerfile` de la raíz **solo hace** `FROM ghcr.io/...` (pull). El build pesado está en `Dockerfile.build` (GitHub Actions, matrix por cámara).

1. Push → Actions buildea **dos** imágenes (`diputados-latest` / `senadores-latest` + `:<chamber>-<sha>`).
2. Coolify “build” del `Dockerfile` = pull de GHCR (segundos). **No** debe aparecer `RUN pnpm build` en los logs.
3. Si ves `Building docker image` + `pnpm build` + exit 137: todavía está usando el Dockerfile viejo multi-stage; redeployá con el `Dockerfile` thin.
4. Package GHCR privado → en Coolify, Docker Registry: `ghcr.io` + PAT `read:packages`.
5. Build arg `IMAGE_TAG` = `diputados-latest` o `senadores-latest` (o `diputados-<sha>` puntual).
6. Evitá race Git vs Actions: desactivá auto-deploy al push. Secrets GHA: `COOLIFY_API_TOKEN`, `COOLIFY_APP_UUID_DIPUTADOS`, `COOLIFY_APP_UUID_SENADORES` (fallback legado: `COOLIFY_APP_UUID` → senadores).

```bash
# Local (máquina con RAM) — una cámara
docker build -f Dockerfile.build \
  --build-arg NODE_MAX_OLD_SPACE_SIZE=6144 \
  --build-arg NUXT_PUBLIC_DEFAULT_CHAMBER=diputados \
  -t diputados-senadores:diputados .
```

Cuando haya movimiento en las cámaras (datos en RAM):

```bash
curl -X POST https://senadores.argentinadatos.com/api/revalidate \
  -H "Authorization: Bearer $NUXT_REVALIDATE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"clearData":true}'
```

Eso vacía las caches en RAM; el próximo request vuelve a bajar datos de `api.argentinadatos.com`. **No** invalida HTML SSG ni CDN: hace falta redeploy (o purge CF de paths SSR largos).

Redirects SEO nombre→id: `server/middleware/legacy-seo.ts` (mapa en `assets/legacy-senador-redirects.json`).

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
  lib/                   # chamber, *-data, types, utils, prerender-manifest
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

Matching voto↔persona: slug + fuzzy (sin tildes, apellido+primer nombre) + aliases
locales en `app/data/senadores-alias-nombres.json` (`manual` editable, `auto` precargado).
Diputados tiene lista local en `diputados-data.ts`.

## Dónde tocar qué

| Quiero… | Empiezo en… |
|---------|-------------|
| Cambiar brand/nav/footer/SEO por cámara | `lib/chamber.ts`, `AppNavbar`, `AppFooter`, `plugins/chamber-seo.ts` |
| Nueva página de miembros | `pages/diputados/*` o `pages/senadores/*` (no “genérica” que rompa URLs) |
| Home o actas distintas por cámara | `components/chamber/*`, `components/actas/*` + wrapper en `pages/` |
| Lógica de API / stats | `lib/*-data.ts` (solo server) + `server/utils/mini-api.ts` + `server/api/*` |
| Hemiciclo / hover grupos | `HemicicloChart.vue` (+ wrappers `DiputadosChart` / `SenadoresChart`) |
| Colores de voto/resultado | `utils/votoTipo.ts`, badges existentes |

**Regla:** páginas/composables del cliente consumen `/api/*` (Host → cámara). No importar `getActas` / `get*ConActas` en código que corra en el browser.

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
# Mini-API (slices, no dump). Pasá chamber en query si no hay Host (SSR interno):
curl -s -H 'Host: diputados.localhost' 'http://127.0.0.1:3200/api/search-catalog?chamber=diputados' | head -c 200
curl -s 'http://127.0.0.1:3200/api/members/HCDN3181?chamber=diputados' | head -c 200
```
