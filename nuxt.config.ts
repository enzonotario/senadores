import { CHAMBERS, type ChamberId } from "./app/lib/chamber";
import {
  ACTAS_SSG_YEARS,
  collectChamberPrerenderRoutes,
} from "./app/lib/prerender-manifest";

const defaultChamber: ChamberId =
  (process.env.NUXT_PUBLIC_DEFAULT_CHAMBER as ChamberId) || "senadores";
const chamberSite = CHAMBERS[defaultChamber];

const revalidateSecret = process.env.NUXT_REVALIDATE_SECRET || "";

/**
 * Nitro `node-server` (Coolify / Docker).
 * Hybrid SSG: dos imágenes/servicios (DEFAULT_CHAMBER=diputados|senadores).
 * Índices + activos + actas ≤4a → prerender; resto SSR + Cache-Control largo.
 * En Docker (`DOCKER_BUILD=1`): menos RAM peak (minify + rollup paralelo).
 */
const dockerBuild = process.env.DOCKER_BUILD === "1";

/** CDN/browser: HTML SSR “casi eterno” hasta el próximo deploy (+ purge CF). */
const ssrLongCache = {
  headers: {
    "cache-control":
      "public, max-age=31536000, stale-while-revalidate=86400",
  },
} as const;

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  // SSR + prerender selectivo (hybrid). Cámara fijada en build vía DEFAULT_CHAMBER.
  ssr: true,
  nitro: {
    preset: "node-server",
    sourceMap: false,
    compressPublicAssets: !dockerBuild,
    minify: !dockerBuild,
    prerender: {
      // Rutas las agrega el hook `prerender:routes` (manifiesto por cámara).
      crawlLinks: false,
      failOnError: false,
    },
    ...(dockerBuild
      ? {
          rollupConfig: {
            maxParallelFileOps: 1,
          },
        }
      : {}),
  },

  hooks: {
    async "prerender:routes"(ctx) {
      const routes = await collectChamberPrerenderRoutes(defaultChamber);
      for (const route of routes) {
        ctx.routes.add(route);
      }
      console.info(
        `[prerender] ${defaultChamber}: ${routes.length} rutas (índices + activos + actas ≤${ACTAS_SSG_YEARS}a)`,
      );
    },
  },

  routeRules: {
    "/api/**": { cache: false },
    // Shells de índice: SSG solo de la cámara de esta imagen.
    "/": { prerender: true },
    "/actas": { prerender: true },
    ...(defaultChamber === "diputados"
      ? {
          "/diputados": { prerender: true },
          "/diputados/bloques": { prerender: true },
        }
      : {
          "/senadores": { prerender: true },
          "/senadores/partidos": { prerender: true },
        }),
    // Detalle: HTML prerenderizado si está en el manifiesto; si no, SSR + cache larga.
    "/diputados/**": ssrLongCache,
    "/senadores/**": ssrLongCache,
    "/actas/**": ssrLongCache,
  },

  build: {
    transpile: ["vue"],
  },

  appDir: "app",

  modules: [
    "@nuxt/ui",
    "@nuxtjs/color-mode",
    "@pinia/nuxt",
    "@vueuse/nuxt",
    "@nuxt/image",
    "@nuxtjs/sitemap",
    "nuxt-og-image",
    "@nuxt/eslint",
    "nuxt-gtag",
    "nuxt-echarts",
  ],

  echarts: {
    renderer: "canvas",
    charts: [
      "LineChart",
      "BarChart",
      "PieChart",
      "HeatmapChart",
      "SankeyChart",
      "GraphChart",
    ],
    components: [
      "GridComponent",
      "TooltipComponent",
      "LegendComponent",
      "DataZoomComponent",
      "ToolboxComponent",
      "DatasetComponent",
      "TitleComponent",
      "VisualMapComponent",
    ],
    features: ["LabelLayout", "UniversalTransition"],
  },

  sitemap: {
    enabled: true,
    sitemapName: "sitemap.xml",
  },

  site: {
    url: chamberSite.siteUrl,
    name: chamberSite.siteName,
    description: chamberSite.siteDescription,
  },

  // Takumi renderer: components/**/*.takumi.vue
  // @see https://takumi.kane.tw/docs/integration/nuxt
  // Node/Docker: el optionalDependency nativo no entra en .output (ver Dockerfile.build).
  ogImage: {
    defaults: {
      width: 1200,
      height: 630,
      // Embebido en meta; absolute URL vía site.url / request origin.
    },
  },

  ui: {
    theme: {
      defaultVariants: {
        color: "neutral",
      },
      colors: [
        "primary",
        "secondary",
        "success",
        "info",
        "warning",
        "error",
        "neutral",
      ],
    },
  },

  colorMode: {
    preference: "light",
    fallback: "light",
    storage: "cookie",
    globalName: "__NUXT_COLOR_MODE__",
    componentName: "ColorScheme",
    classPrefix: "",
    classSuffix: "",
    storageKey: "nuxt-color-mode",
  },

  css: ["@/assets/css/main.css"],

  vite: {
    server: {
      // Subdominios locales para elegir cámara por Host
      allowedHosts: [
        ".localhost",
        ".localhost.test",
        "diputados.localhost.test",
        "senadores.localhost.test",
      ],
    },
  },

  image: {
    domains: [
      "api.argentinadatos.com",
      "www.senadores.gob.ar",
      "www.diputados.gob.ar",
    ],
    format: ["avif", "webp"],
    quality: 80,
  },

  runtimeConfig: {
    // Solo server. Override: NUXT_REVALIDATE_SECRET
    revalidateSecret,
    public: {
      defaultChamber,
      baseUrl: process.env.NUXT_PUBLIC_BASE_URL || chamberSite.siteUrl,
      siteUrl: chamberSite.siteUrl,
      siteName: chamberSite.siteName,
      siteDescription: chamberSite.siteDescription,
      apiUrl:
        process.env.NUXT_PUBLIC_API_URL ||
        process.env.NUXT_PUBLIC_API_BASE_URL ||
        "https://api.argentinadatos.com",
      apiBaseUrl:
        process.env.NUXT_PUBLIC_API_BASE_URL ||
        "https://api.argentinadatos.com",
    },
  },

  app: {
    head: {
      htmlAttrs: {
        lang: "es",
      },
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      // Título/description por cámara: plugins/chamber-seo.ts + useChamberSeo.
      meta: [
        { name: "author", content: "Argentina Datos" },
        { name: "format-detection", content: "telephone=no" },
        { name: "theme-color", content: "#000000" },
        { name: "msapplication-TileColor", content: "#000000" },
        { name: "robots", content: "index, follow" },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: "es_AR" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: "@enzonotario_" },
        { name: "twitter:creator", content: "@enzonotario_" },
      ],
      link: [
        { rel: "icon", type: "image/png", href: "/favicon.ico" },
        { rel: "preconnect", href: "https://api.argentinadatos.com" },
        { rel: "dns-prefetch", href: "https://api.argentinadatos.com" },
        { rel: "preconnect", href: "https://www.googletagmanager.com" },
        { rel: "dns-prefetch", href: "https://www.googletagmanager.com" },
      ],
    },
  },

  gtag: {
    id: process.env.NUXT_PUBLIC_GTAG_ID || "G-F4L9NTC3WW",
  },
});
