import {
  parseSiteId,
  SITES,
  type SiteId,
} from "./app/lib/chamber";
import {
  ACTAS_SSG_YEARS,
  collectSitePrerenderRoutes,
} from "./app/lib/prerender-manifest";

/** Sitio del build: diputados | senadores | congreso (env DEFAULT_CHAMBER). */
const defaultSite: SiteId = parseSiteId(
  process.env.NUXT_PUBLIC_DEFAULT_CHAMBER,
  "senadores",
);
const siteConfig = SITES[defaultSite];

const revalidateSecret = process.env.NUXT_REVALIDATE_SECRET || "";

/**
 * Nitro `node-server` (Coolify / Docker).
 * Hybrid SSG: una imagen por sitio (DEFAULT_CHAMBER=diputados|senadores|congreso).
 * Cámaras: índices + activos + actas ≤4a. Congreso: solo `/`.
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

const chamberIndexRules =
  defaultSite === "diputados"
    ? {
        "/actas": { prerender: true },
        "/diputados": { prerender: true },
        "/diputados/bloques": { prerender: true },
      }
    : defaultSite === "senadores"
      ? {
          "/actas": { prerender: true },
          "/senadores": { prerender: true },
          "/senadores/partidos": { prerender: true },
        }
      : {};

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  // SSR + prerender selectivo (hybrid). Sitio fijado en build vía DEFAULT_CHAMBER.
  // Hosts: diputados.* / senadores.* / congreso.* (mismo path ≠ mismo sitio).
  ssr: true,
  nitro: {
    preset: "node-server",
    sourceMap: false,
    compressPublicAssets: !dockerBuild,
    minify: !dockerBuild,
    prerender: {
      // Rutas las agrega el hook `prerender:routes` (manifiesto por sitio).
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
      const routes = await collectSitePrerenderRoutes(defaultSite);
      for (const route of routes) {
        ctx.routes.add(route);
      }
      const detail =
        defaultSite === "congreso"
          ? "solo /"
          : `índices + activos + actas ≤${ACTAS_SSG_YEARS}a`;
      console.info(
        `[prerender] ${defaultSite}: ${routes.length} rutas (${detail})`,
      );
    },
  },

  routeRules: {
    // Cache por path no distingue Host (diputados / senadores / congreso).
    "/api/**": { cache: false },
    "/": { prerender: true },
    ...chamberIndexRules,
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
      "MapChart",
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
      "GeoComponent",
      // Bandas / divisores de mandato en MemberVotingCharts
      "MarkLineComponent",
      "MarkAreaComponent",
    ],
    features: ["LabelLayout", "UniversalTransition"],
  },

  sitemap: {
    enabled: true,
    sitemapName: "sitemap.xml",
  },

  site: {
    url: siteConfig.siteUrl,
    name: siteConfig.siteName,
    description: siteConfig.siteDescription,
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
        "congreso.localhost.test",
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
    // Solo server. Override: NUXT_REVALIDATE_SECRET / NUXT_CORS_ORIGINS
    revalidateSecret,
    corsOrigins: process.env.NUXT_CORS_ORIGINS || "",
    public: {
      defaultChamber: defaultSite,
      baseUrl: process.env.NUXT_PUBLIC_BASE_URL || siteConfig.siteUrl,
      siteUrl: siteConfig.siteUrl,
      siteName: siteConfig.siteName,
      siteDescription: siteConfig.siteDescription,
      apiUrl:
        process.env.NUXT_PUBLIC_API_URL ||
        process.env.NUXT_PUBLIC_API_BASE_URL ||
        "https://api.argentinadatos.com",
      apiBaseUrl:
        process.env.NUXT_PUBLIC_API_BASE_URL ||
        "https://api.argentinadatos.com",
      /** Base de la mini-API (`/api/*`). Vacío = same-origin. */
      appApiBaseUrl: (
        process.env.NUXT_PUBLIC_APP_API_BASE_URL || ""
      ).replace(/\/$/, ""),
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
        { rel: "icon", href: "/favicon.ico" },
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
