import type { ChamberId } from "@/lib/chamber";
import {
  encodeOgVotes,
  resolveOgAccent,
  truncateOgText,
  type ChamberOgInput,
} from "@/lib/og";

export type ChamberSeoInput = {
  /** Título corto de la página (sin host). */
  title: string;
  description: string;
  /** Props de la tarjeta OG Takumi (`Chamber.takumi`). */
  og?: ChamberOgInput;
};

/**
 * SEO por cámara + OG dinámica con Nuxt OG Image / Takumi.
 *
 * @see https://takumi.kane.tw/docs/integration/nuxt
 *
 * Importante: no pasar un getter a `useSeoMeta(() => …)` — Unhead 2 destruye
 * el argumento y `title` queda undefined.
 *
 * X/Twitter: la tarjeta Takumi ya lleva título/descripción en la imagen.
 * X pinta `og:title` encima → usamos ZWSP en og/twitter title para que la
 * card se vea como imagen, no como banner con texto duplicado.
 */
const OG_TITLE_ZWSP = "\u200B";

export function useChamberSeo(input: MaybeRefOrGetter<ChamberSeoInput>) {
  const { chamber } = useChamber();
  const requestURL = useRequestURL();

  const seo = computed(() => {
    const value = toValue(input);
    const pageTitle = (value.title || "").trim() || chamber.value.siteName;
    const description = (value.description || "").trim();
    return {
      pageTitle,
      fullTitle: `${pageTitle} | ${chamber.value.siteHost}`,
      description,
      imageAlt: description
        ? `${pageTitle} — ${description}`
        : pageTitle,
      og: value.og,
    };
  });

  const pageUrl = computed(() => {
    // Host canónico de la cámara (prod); path del request actual.
    try {
      return new URL(requestURL.pathname + requestURL.search, chamber.value.siteUrl)
        .href;
    } catch {
      return chamber.value.siteUrl;
    }
  });

  useHead(() => ({
    title: seo.value.fullTitle,
    titleTemplate: "%s",
    meta: [
      { name: "description", content: seo.value.description },
      // Open Graph: título invisible (imagen lleva el copy); description sí.
      { property: "og:title", content: OG_TITLE_ZWSP },
      { property: "og:description", content: seo.value.description },
      { property: "og:url", content: pageUrl.value },
      { property: "og:image:alt", content: seo.value.imageAlt },
      // X / Twitter
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@enzonotario_" },
      { name: "twitter:creator", content: "@enzonotario_" },
      { name: "twitter:title", content: OG_TITLE_ZWSP },
      { name: "twitter:description", content: seo.value.description },
      { name: "twitter:image:alt", content: seo.value.imageAlt },
    ],
  }));

  // Takumi via Nuxt OG Image — defineOgImage setea og:image / twitter:image.
  defineOgImage("Chamber.takumi", {
    title: computed(() => truncateOgText(seo.value.pageTitle, 110)),
    description: computed(() => truncateOgText(seo.value.description, 160)),
    brand: computed(() => chamber.value.brand),
    // Path relativo en /public — el island del OG lo resuelve en el mismo server.
    // No usar useRequestURL().origin: con Host senadores.localhost sin puerto
    // queda :80 y el fetch del logo falla.
    logoSrc: computed(() => chamber.value.logoSrc),
    eyebrow: computed(
      () => seo.value.og?.eyebrow || chamber.value.brand,
    ),
    badge: computed(() => seo.value.og?.badge || ""),
    accent: computed(() =>
      resolveOgAccent(
        seo.value.og?.accent,
        chamber.value.id as ChamberId,
      ),
    ),
    footerLeft: computed(() => seo.value.og?.footerLeft || ""),
    votes: computed(() => encodeOgVotes(seo.value.og)),
    photoSrc: computed(() => seo.value.og?.photoSrc || ""),
    hemiciclo: computed(() => seo.value.og?.hemiciclo || ""),
  });
}
